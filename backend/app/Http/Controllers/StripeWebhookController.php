<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\BookingTransaction;
use App\Models\PropertyAvailability;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Stripe\Webhook;

class StripeWebhookController extends Controller
{
    public function handle(Request $request)
    {
        $payload   = $request->getContent();
        $signature = $request->header('Stripe-Signature');
        $secret    = config('services.stripe.webhook_secret');

        // 1. Verify webhook signature if secret is configured
        if (!empty($secret)) {
            try {
                $event = Webhook::constructEvent($payload, $signature, $secret);
            } catch (\Throwable $e) {
                Log::error('Stripe webhook verification failed', [
                    'error' => $e->getMessage(),
                ]);
                return response('Invalid signature', 400);
            }
        } elseif (app()->environment('production')) {
            // Security requirement: In production, webhook secret is strictly required
            Log::error('Stripe webhook rejected: STRIPE_WEBHOOK_SECRET must be configured in production.');
            return response('Webhook signature secret required in production', 403);
        } else {
            // In local development mode without webhook secret configured, parse payload with strict validation
            $data = json_decode($payload, true);
            if (!$data || !isset($data['type'])) {
                return response('Invalid payload', 400);
            }
            $event = (object) [
                'type' => $data['type'],
                'data' => (object) ['object' => json_decode(json_encode($data['data']['object']))],
            ];
            Log::info('Stripe webhook received (development mode without signature secret)', [
                'type' => $event->type,
            ]);
        }

        // 2. Handle Stripe events
        switch ($event->type) {
            case 'payment_intent.succeeded':
                $this->handlePaymentIntentSucceeded($event->data->object);
                break;

            case 'checkout.session.completed':
                $this->handleCheckoutSessionCompleted($event->data->object);
                break;

            case 'payment_intent.payment_failed':
                $this->handlePaymentIntentFailed($event->data->object);
                break;

            default:
                Log::info('Unhandled Stripe event: ' . $event->type);
        }

        return response('Webhook received', 200);
    }

    /**
     * Handle payment_intent.succeeded
     */
    protected function handlePaymentIntentSucceeded(object $intent): void
    {
        $intentId  = $intent->id;
        $bookingId = $intent->metadata->booking_id ?? null;

        Log::info("Stripe PaymentIntent succeeded: {$intentId}", ['booking_id' => $bookingId]);

        // Find booking by metadata ID or transaction code
        $booking = null;
        if ($bookingId) {
            $booking = Booking::find($bookingId);
        }

        if (!$booking) {
            $transaction = BookingTransaction::where('transaction_code', $intentId)->first();
            if ($transaction) {
                $booking = $transaction->booking;
            }
        }

        if ($booking) {
            DB::transaction(function () use ($booking, $intent, $intentId) {
                $booking->update([
                    'status'         => 'confirmed',
                    'payment_status' => 'paid',
                ]);

                // Update or create transaction record
                BookingTransaction::updateOrCreate(
                    [
                        'booking_id'       => $booking->id,
                        'transaction_code' => $intentId,
                    ],
                    [
                        'user_id'          => $booking->guest_id,
                        'type'             => 'charge',
                        'amount'           => ((float) $intent->amount) / 100,
                        'currency'         => strtoupper($intent->currency),
                        'payment_method'   => 'stripe_card',
                        'payment_gateway'  => 'stripe',
                        'status'           => 'successful',
                        'raw_response'     => json_decode(json_encode($intent), true),
                    ]
                );

                // Ensure dates are marked as booked in property_availabilities
                $checkIn  = Carbon::parse($booking->check_in);
                $checkOut = Carbon::parse($booking->check_out);
                $curr = $checkIn->copy();
                while ($curr->lt($checkOut)) {
                    PropertyAvailability::updateOrCreate(
                        ['property_id' => $booking->property_id, 'date' => $curr->toDateString()],
                        [
                            'is_available' => false,
                            'status'       => 'booked',
                            'note'         => "Booking {$booking->booking_code}",
                        ]
                    );
                    $curr->addDay();
                }
            });

            Log::info("Booking {$booking->booking_code} marked as PAID and CONFIRMED via Stripe Webhook");
        } else {
            // Webhook arrived before frontend completed bookingApi.createBooking()
            Log::info("Stripe PaymentIntent {$intentId} received before booking record exists. Synchronous API will finalize transaction with anti-replay protection.", [
                'metadata' => $intent->metadata ?? null,
                'amount'   => $intent->amount ?? null,
            ]);
        }
    }

    /**
     * Handle checkout.session.completed
     */
    protected function handleCheckoutSessionCompleted(object $session): void
    {
        if ($session->payment_status !== 'paid') {
            return;
        }

        $bookingId = $session->metadata->booking_id ?? $session->client_reference_id ?? null;
        $booking   = $bookingId ? Booking::find($bookingId) : null;

        if ($booking) {
            $intentId = $session->payment_intent ?? $session->id;

            DB::transaction(function () use ($booking, $session, $intentId) {
                $booking->update([
                    'status'         => 'confirmed',
                    'payment_status' => 'paid',
                ]);

                BookingTransaction::updateOrCreate(
                    [
                        'booking_id'       => $booking->id,
                        'transaction_code' => $intentId,
                    ],
                    [
                        'user_id'          => $booking->guest_id,
                        'type'             => 'charge',
                        'amount'           => ((float) $session->amount_total) / 100,
                        'currency'         => strtoupper($session->currency),
                        'payment_method'   => 'stripe_checkout',
                        'payment_gateway'  => 'stripe',
                        'status'           => 'successful',
                        'raw_response'     => json_decode(json_encode($session), true),
                    ]
                );
            });

            Log::info("Checkout Session {$session->id} completed for Booking {$booking->booking_code}");
        }
    }

    /**
     * Handle payment_intent.payment_failed
     */
    protected function handlePaymentIntentFailed(object $intent): void
    {
        $intentId  = $intent->id;
        $bookingId = $intent->metadata->booking_id ?? null;

        Log::warning("Stripe PaymentIntent failed: {$intentId}", [
            'booking_id'    => $bookingId,
            'error_message' => $intent->last_payment_error->message ?? 'Unknown failure',
        ]);

        if ($bookingId) {
            $booking = Booking::find($bookingId);
            if ($booking) {
                BookingTransaction::create([
                    'booking_id'       => $booking->id,
                    'user_id'          => $booking->guest_id,
                    'transaction_code' => $intentId,
                    'type'             => 'charge',
                    'amount'           => ((float) $intent->amount) / 100,
                    'currency'         => strtoupper($intent->currency),
                    'payment_method'   => 'stripe_card',
                    'payment_gateway'  => 'stripe',
                    'status'           => 'failed',
                    'raw_response'     => json_decode(json_encode($intent), true),
                ]);
            }
        }
    }
}
