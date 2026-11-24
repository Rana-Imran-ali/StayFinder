<?php

namespace App\Http\Controllers;

use App\Models\Property;
use App\Services\PricingCalculatorService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Stripe\PaymentIntent;
use Stripe\Stripe;

class PaymentController extends Controller
{
    public function __construct(
        private readonly PricingCalculatorService $pricer
    ) {}

    /**
     * GET /api/payments/config
     * Returns the Stripe publishable key to the authenticated frontend.
     */
    public function getConfig(): JsonResponse
    {
        $key = config('services.stripe.key');
        return response()->json([
            'success'         => true,
            'publishable_key' => $key,
            'data'            => [
                'publishable_key' => $key,
            ],
        ]);
    }

    /**
     * POST /api/payments/create-intent
     * Creates a Stripe PaymentIntent for the selected stay dates and parameters.
     */
    public function createPaymentIntent(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'property_id'  => ['required', 'integer', 'exists:properties,id'],
            'check_in'     => ['required', 'date', 'after_or_equal:today'],
            'check_out'    => ['required', 'date', 'after:check_in'],
            'guests_count' => ['required', 'integer', 'min:1'],
            'has_pet'      => ['nullable', 'boolean'],
        ]);

        $property = Property::findOrFail($data['property_id']);

        if ($property->status !== 'published') {
            return response()->json([
                'success' => false,
                'message' => 'This property is not currently accepting reservations.',
            ], 422);
        }

        if ($property->host_id === $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Hosts cannot book their own listings.',
            ], 422);
        }

        // Calculate official stay price
        try {
            $calc = $this->pricer->calculate(
                $property,
                $data['check_in'],
                $data['check_out'],
                (int) $data['guests_count'],
                (bool) ($data['has_pet'] ?? false)
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        if (!$calc['available']) {
            return response()->json([
                'success' => false,
                'message' => 'One or more of the selected dates are unavailable or blocked.',
            ], 422);
        }

        $stripeSecret = config('services.stripe.secret');
        if (empty($stripeSecret)) {
            return response()->json([
                'success' => false,
                'message' => 'Stripe secret key is not configured in backend environment.',
            ], 500);
        }

        Stripe::setApiKey($stripeSecret);

        $amountCents = (int) round($calc['total'] * 100);
        $currency    = strtolower($calc['currency'] ?? 'usd');

        try {
            $intent = PaymentIntent::create([
                'amount'                    => $amountCents,
                'currency'                  => $currency,
                'automatic_payment_methods' => ['enabled' => true],
                'metadata'                  => [
                    'user_id'      => (string) $user->id,
                    'user_email'   => $user->email,
                    'property_id'  => (string) $property->id,
                    'check_in'     => $data['check_in'],
                    'check_out'    => $data['check_out'],
                    'guests_count' => (string) $data['guests_count'],
                ],
                'description'               => "StayFinder Reservation: {$property->title} ({$calc['nights']} nights)",
            ]);

            return response()->json([
                'success'           => true,
                'client_secret'     => $intent->client_secret,
                'payment_intent_id' => $intent->id,
                'amount'            => $calc['total'],
                'currency'          => strtoupper($currency),
                'breakdown'         => $calc,
                'data'              => [
                    'client_secret'     => $intent->client_secret,
                    'payment_intent_id' => $intent->id,
                    'amount'            => $calc['total'],
                    'currency'          => strtoupper($currency),
                    'breakdown'         => $calc,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Stripe error: ' . $e->getMessage(),
            ], 500);
        }
    }
}
