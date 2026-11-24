<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\BookingTransaction;
use App\Models\Property;
use App\Models\PropertyAvailability;
use App\Models\AppNotification;
use App\Services\PricingCalculatorService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BookingController extends Controller
{
    public function __construct(
        private readonly PricingCalculatorService $pricer
    ) {}

    /**
     * GET /api/bookings
     * List bookings for the authenticated guest.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $tab  = $request->input('tab', 'all'); // upcoming, past, cancelled, all

        $query = Booking::with([
            'property.primaryImage',
            'property.cityRelation',
            'property.countryRelation',
            'host.profile',
        ])
        ->where('guest_id', $user->id)
        ->latest();

        if ($tab === 'upcoming') {
            $query->whereIn('status', ['pending', 'confirmed'])
                  ->where('check_in', '>=', now()->toDateString());
        } elseif ($tab === 'past') {
            $query->where(function ($q) {
                $q->where('status', 'completed')
                  ->orWhere(function ($sub) {
                      $sub->where('status', 'confirmed')
                          ->where('check_out', '<', now()->toDateString());
                  });
            });
        } elseif ($tab === 'cancelled') {
            $query->whereIn('status', ['cancelled', 'rejected']);
        }

        $bookings = $query->paginate((int) $request->input('per_page', 10));

        return response()->json([
            'success' => true,
            'data'    => $bookings,
        ]);
    }

    /**
     * GET /api/bookings/{id}
     * Get single booking detail.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user    = $request->user();
        $booking = Booking::with([
            'property.images',
            'property.host.profile',
            'guest.profile',
            'transactions',
            'cancelledByUser',
        ])->findOrFail($id);

        // Authorization check
        $isGuest = $booking->guest_id === $user->id;
        $isHost  = $booking->host_id === $user->id;
        $isAdmin = $user->hasRole('admin');

        if (! $isGuest && ! $isHost && ! $isAdmin) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to view this reservation.',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data'    => $booking,
        ]);
    }

    /**
     * POST /api/bookings
     * Create a new reservation.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'property_id'       => ['required', 'integer', 'exists:properties,id'],
            'check_in'          => ['required', 'date', 'after_or_equal:today'],
            'check_out'         => ['required', 'date', 'after:check_in'],
            'guests_count'      => ['required', 'integer', 'min:1'],
            'has_pet'           => ['boolean'],
            'special_requests'  => ['nullable', 'string', 'max:500'],
            'payment_method'    => ['nullable', 'string'],
            'payment_intent_id' => ['nullable', 'string'],
        ]);

        $property = Property::findOrFail($data['property_id']);

        if ($property->status !== 'published') {
            return response()->json([
                'success' => false,
                'message' => 'This property is not currently accepting reservations.',
            ], 422);
        }

        // Host cannot book their own property
        if ($property->host_id === $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot book your own listing.',
            ], 422);
        }

        if ($data['guests_count'] > $property->max_guests) {
            return response()->json([
                'success' => false,
                'message' => "This property allows a maximum of {$property->max_guests} guests.",
            ], 422);
        }

        $checkIn  = Carbon::parse($data['check_in'])->startOfDay();
        $checkOut = Carbon::parse($data['check_out'])->startOfDay();

        // 1. Initial quick pre-check for date collision
        $hasOverlap = Booking::where('property_id', $property->id)
            ->whereIn('status', ['confirmed', 'pending'])
            ->where(function ($q) use ($checkIn, $checkOut) {
                $q->where('check_in', '<', $checkOut->toDateString())
                  ->where('check_out', '>', $checkIn->toDateString());
            })
            ->exists();

        if ($hasOverlap) {
            return response()->json([
                'success' => false,
                'message' => 'The selected dates are already booked or pending approval.',
            ], 422);
        }

        // 2. Calculate official pricing & verify calendar availability
        try {
            $calc = $this->pricer->calculate(
                $property,
                $checkIn->toDateString(),
                $checkOut->toDateString(),
                (int) $data['guests_count'],
                (bool) ($data['has_pet'] ?? false)
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        if (! $calc['available']) {
            return response()->json([
                'success' => false,
                'message' => 'One or more of the selected dates have been blocked by the host.',
            ], 422);
        }

        // 3. Verify Stripe PaymentIntent & Prevent Replay / Tampering Attacks
        $stripeIntent = null;
        if (!empty($data['payment_intent_id'])) {
            // Anti-replay protection: verify payment intent has not been consumed yet
            $alreadyUsed = BookingTransaction::where('transaction_code', $data['payment_intent_id'])->exists();
            if ($alreadyUsed) {
                return response()->json([
                    'success' => false,
                    'message' => 'This payment authorization has already been used for a previous reservation.',
                ], 422);
            }

            $secret = config('services.stripe.secret');
            if ($secret) {
                \Stripe\Stripe::setApiKey($secret);
                try {
                    $stripeIntent = \Stripe\PaymentIntent::retrieve($data['payment_intent_id']);
                    if ($stripeIntent->status !== 'succeeded') {
                        return response()->json([
                            'success' => false,
                            'message' => 'Stripe payment has not succeeded yet (status: ' . $stripeIntent->status . ').',
                        ], 422);
                    }

                    // Anti-tampering check: verify ownership of payment intent
                    if (isset($stripeIntent->metadata->user_id) && (int) $stripeIntent->metadata->user_id !== $user->id) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Payment authorization does not belong to the authenticated user.',
                        ], 403);
                    }

                    // Anti-tampering check: verify property matches intent
                    if (isset($stripeIntent->metadata->property_id) && (int) $stripeIntent->metadata->property_id !== $property->id) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Payment authorization does not match the property being booked.',
                        ], 422);
                    }

                    // Financial integrity check: verify charged amount matches official calculation
                    $expectedCents = (int) round($calc['total'] * 100);
                    if ($stripeIntent->amount < $expectedCents) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Authorized payment amount is less than the calculated total price.',
                        ], 422);
                    }
                } catch (\Exception $e) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unable to verify Stripe payment: ' . $e->getMessage(),
                    ], 422);
                }
            }
        }

        // 4. Atomic reservation creation with Pessimistic Concurrency Locking
        try {
            $booking = DB::transaction(function () use ($user, $property, $checkIn, $checkOut, $data, $calc, $stripeIntent) {
                // Pessimistic lock on active overlapping bookings to prevent double-booking race condition
                $lockedOverlap = Booking::where('property_id', $property->id)
                    ->whereIn('status', ['confirmed', 'pending'])
                    ->where(function ($q) use ($checkIn, $checkOut) {
                        $q->where('check_in', '<', $checkOut->toDateString())
                          ->where('check_out', '>', $checkIn->toDateString());
                    })
                    ->lockForUpdate()
                    ->exists();

                if ($lockedOverlap) {
                    throw new \RuntimeException('The selected dates were just booked by another guest.');
                }

                // Pessimistic lock on blocked calendar dates
                $blockedDates = PropertyAvailability::where('property_id', $property->id)
                    ->where('date', '>=', $checkIn->toDateString())
                    ->where('date', '<', $checkOut->toDateString())
                    ->where('is_available', false)
                    ->lockForUpdate()
                    ->exists();

                if ($blockedDates) {
                    throw new \RuntimeException('One or more selected dates are no longer available on the calendar.');
                }

                $isInstant = (bool) $property->instant_bookable;
                $hasPaid   = $stripeIntent !== null || $isInstant;
                $status    = ($isInstant || $stripeIntent !== null) ? 'confirmed' : 'pending';
                $payStatus = $hasPaid ? 'paid' : 'unpaid';

                $newBooking = Booking::create([
                    'booking_code'     => Booking::generateBookingCode(),
                    'property_id'      => $property->id,
                    'guest_id'         => $user->id,
                    'host_id'          => $property->host_id,
                    'check_in'         => $checkIn->toDateString(),
                    'check_out'        => $checkOut->toDateString(),
                    'nights'           => $calc['nights'],
                    'guests_count'     => $data['guests_count'],
                    'has_pet'          => (bool) ($data['has_pet'] ?? false),
                    'base_price'       => $calc['base_total'],
                    'cleaning_fee'     => $calc['cleaning_fee'],
                    'extra_guest_fee'  => $calc['extra_guest_fee'],
                    'pet_fee'          => $calc['pet_fee'],
                    'discount_amount'  => $calc['discount_amount'],
                    'discount_label'   => $calc['discount_label'],
                    'tax_amount'       => $calc['tax_amount'],
                    'security_deposit' => $calc['security_deposit'],
                    'total_amount'     => $calc['total'],
                    'currency'         => $calc['currency'] ?? 'USD',
                    'status'           => $status,
                    'payment_status'   => $payStatus,
                    'special_requests' => $data['special_requests'] ?? null,
                ]);

                // If confirmed / paid, block the dates in property_availabilities
                if ($status === 'confirmed') {
                    $curr = $checkIn->copy();
                    while ($curr->lt($checkOut)) {
                        PropertyAvailability::updateOrCreate(
                            ['property_id' => $property->id, 'date' => $curr->toDateString()],
                            [
                                'is_available' => false,
                                'status'       => 'booked',
                                'note'         => "Booking {$newBooking->booking_code}",
                            ]
                        );
                        $curr->addDay();
                    }

                    // Log payment transaction
                    if ($stripeIntent) {
                        BookingTransaction::create([
                            'booking_id'       => $newBooking->id,
                            'user_id'          => $user->id,
                            'transaction_code' => $stripeIntent->id,
                            'type'             => 'charge',
                            'amount'           => ((float) $stripeIntent->amount) / 100,
                            'currency'         => strtoupper($stripeIntent->currency),
                            'payment_method'   => 'stripe_card',
                            'payment_gateway'  => 'stripe',
                            'status'           => 'successful',
                            'raw_response'     => [
                                'payment_intent_id' => $stripeIntent->id,
                                'status'            => $stripeIntent->status,
                                'amount'            => $stripeIntent->amount,
                                'currency'          => $stripeIntent->currency,
                            ],
                        ]);
                    } else {
                        BookingTransaction::create([
                            'booking_id'       => $newBooking->id,
                            'user_id'          => $user->id,
                            'transaction_code' => BookingTransaction::generateTransactionCode('CH'),
                            'type'             => 'charge',
                            'amount'           => $calc['total'],
                            'currency'         => $newBooking->currency,
                            'payment_method'   => $data['payment_method'] ?? 'card',
                            'payment_gateway'  => 'system',
                            'status'           => 'successful',
                            'raw_response'     => [
                                'auth_code' => strtoupper(\Illuminate\Support\Str::random(6)),
                                'message'   => 'Payment authorized and charged.',
                            ],
                        ]);
                    }
                }

                return $newBooking;
            });
        } catch (\Throwable $e) {
            // Automatic Orphan Charge Refund: If card was already captured on Stripe but DB creation failed, refund immediately!
            if ($stripeIntent && !empty($data['payment_intent_id'])) {
                try {
                    \Stripe\Refund::create([
                        'payment_intent' => $data['payment_intent_id'],
                        'reason'         => 'duplicate',
                    ]);
                    $refundNote = ' Your payment was automatically refunded.';
                } catch (\Exception $refErr) {
                    \Illuminate\Support\Facades\Log::error('Automatic Stripe refund failed: ' . $refErr->getMessage());
                    $refundNote = ' Please contact support quoting payment intent ' . $data['payment_intent_id'] . '.';
                }

                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage() . $refundNote,
                ], 422);
            }

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        // Send In-App Notifications
        try {
            // Notify Host
            AppNotification::send(
                $booking->host_id,
                'booking_created',
                'New Booking Received!',
                "{$user->name} booked {$booking->property->title} from {$booking->check_in} to {$booking->check_out}. Total: \${$booking->total_amount}.",
                '/host-portal#reservations'
            );

            // Notify Guest
            AppNotification::send(
                $user->id,
                'booking_confirmed',
                'Booking Confirmed!',
                "Your reservation at {$booking->property->title} is confirmed. Booking Code: {$booking->booking_code}.",
                '/trips'
            );
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('Notification dispatch failed: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => $booking->status === 'confirmed'
                ? 'Reservation confirmed! Pack your bags.'
                : 'Reservation requested! Awaiting host confirmation.',
            'data'    => $booking->load(['property.primaryImage', 'property.cityRelation', 'host.profile']),
        ], 201);
    }

    /**
     * POST /api/bookings/{id}/cancel
     * Cancel an existing reservation.
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $booking = Booking::with('property')->findOrFail($id);

        $isGuest = $booking->guest_id === $user->id;
        $isHost  = $booking->host_id === $user->id;
        $isAdmin = $user->hasRole('admin');

        if (! $isGuest && ! $isHost && ! $isAdmin) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to cancel this booking.',
            ], 403);
        }

        if (in_array($booking->status, ['cancelled', 'completed', 'rejected'])) {
            return response()->json([
                'success' => false,
                'message' => "This reservation cannot be cancelled because it is already {$booking->status}.",
            ], 422);
        }

        DB::transaction(function () use ($user, $booking, $data) {
            $wasPaid = ($booking->payment_status === 'paid');

            // Unblock calendar dates
            $start = Carbon::parse($booking->check_in);
            $end   = Carbon::parse($booking->check_out);

            $curr = $start->copy();
            while ($curr->lt($end)) {
                $avail = PropertyAvailability::where('property_id', $booking->property_id)
                    ->where('date', $curr->toDateString())
                    ->where('status', 'booked')
                    ->first();

                if ($avail) {
                    $avail->update([
                        'is_available' => true,
                        'status'       => 'available',
                        'note'         => null,
                    ]);
                }
                $curr->addDay();
            }

            // Update booking status
            $booking->update([
                'status'              => 'cancelled',
                'cancelled_by'        => $user->id,
                'cancelled_at'        => now(),
                'cancellation_reason' => $data['reason'],
                'payment_status'      => $wasPaid ? 'refunded' : $booking->payment_status,
            ]);

            // Create refund transaction if was paid (triggering real Stripe refund if paid via Stripe)
            if ($wasPaid) {
                $stripeCharge = $booking->transactions()
                    ->where('payment_gateway', 'stripe')
                    ->where('type', 'charge')
                    ->where('status', 'successful')
                    ->first();

                $refundCode = null;
                $gateway = 'system';
                $refundResponse = ['reason' => $data['reason']];

                if ($stripeCharge && str_starts_with($stripeCharge->transaction_code, 'pi_')) {
                    try {
                        $stripeSecret = config('services.stripe.secret');
                        if ($stripeSecret) {
                            \Stripe\Stripe::setApiKey($stripeSecret);
                            $stripeRefund = \Stripe\Refund::create([
                                'payment_intent' => $stripeCharge->transaction_code,
                                'reason' => 'requested_by_customer',
                            ]);
                            $refundCode = $stripeRefund->id;
                            $gateway = 'stripe';
                            $refundResponse['stripe_refund_id'] = $stripeRefund->id;
                            $refundResponse['status'] = $stripeRefund->status;
                        }
                    } catch (\Exception $e) {
                        \Illuminate\Support\Facades\Log::warning('Stripe refund execution warning: ' . $e->getMessage());
                    }
                }

                BookingTransaction::create([
                    'booking_id'       => $booking->id,
                    'user_id'          => $booking->guest_id,
                    'transaction_code' => $refundCode ?? BookingTransaction::generateTransactionCode('RF'),
                    'type'             => 'refund',
                    'amount'           => $booking->total_amount,
                    'currency'         => $booking->currency,
                    'payment_method'   => $gateway === 'stripe' ? 'stripe_refund' : 'refund_to_original',
                    'payment_gateway'  => $gateway,
                    'status'           => 'successful',
                    'raw_response'     => $refundResponse,
                ]);
            }
        });

        // Notify other party of cancellation
        try {
            $otherUserId = $user->id === $booking->guest_id ? $booking->host_id : $booking->guest_id;
            $cancellerRole = $user->id === $booking->guest_id ? 'The guest' : 'The host';
            AppNotification::send(
                $otherUserId,
                'booking_cancelled',
                'Booking Cancelled',
                "{$cancellerRole} ({$user->name}) cancelled reservation {$booking->booking_code} for {$booking->property->title}. Reason: {$data['reason']}",
                $user->id === $booking->guest_id ? '/host-portal#reservations' : '/trips'
            );
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('Cancellation notification failed: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Reservation cancelled successfully.',
            'data'    => $booking->fresh(['property.primaryImage', 'transactions']),
        ]);
    }
}
