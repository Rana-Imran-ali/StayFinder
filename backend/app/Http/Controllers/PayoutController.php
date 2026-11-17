<?php

namespace App\Http\Controllers;

use App\Models\PayoutMethod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayoutController extends Controller
{
    /**
     * List all payout methods for authenticated host.
     */
    public function index(Request $request): JsonResponse
    {
        $methods = $request->user()->payoutMethods()->orderByDesc('is_default')->get();

        return response()->json([
            'success' => true,
            'data' => $methods,
        ]);
    }

    /**
     * Add a new payout method (Bank Account, PayPal, Stripe).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'string', 'in:bank_transfer,paypal,stripe'],
            'account_holder_name' => ['required', 'string', 'max:255'],
            'bank_name' => ['required_if:type,bank_transfer', 'nullable', 'string', 'max:255'],
            'account_number' => ['required_if:type,bank_transfer', 'nullable', 'string', 'min:4'],
            'routing_number' => ['nullable', 'string', 'max:50'],
            'paypal_email' => ['required_if:type,paypal', 'nullable', 'email'],
            'currency' => ['nullable', 'string', 'max:10'],
            'is_default' => ['nullable', 'boolean'],
        ]);

        $user = $request->user();

        // Extract last 4 digits for safety
        $lastFour = !empty($validated['account_number'])
            ? substr($validated['account_number'], -4)
            : null;

        $hasExisting = $user->payoutMethods()->exists();
        $isDefault = $validated['is_default'] ?? (!$hasExisting);

        if ($isDefault) {
            $user->payoutMethods()->update(['is_default' => false]);
        }

        $payoutMethod = $user->payoutMethods()->create([
            'type' => $validated['type'],
            'account_holder_name' => $validated['account_holder_name'],
            'bank_name' => $validated['bank_name'] ?? null,
            'account_number_last_four' => $lastFour,
            'routing_number' => $validated['routing_number'] ?? null,
            'paypal_email' => $validated['paypal_email'] ?? null,
            'currency' => $validated['currency'] ?? 'USD',
            'is_default' => $isDefault,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payout method added successfully.',
            'data' => $payoutMethod,
        ], 201);
    }

    /**
     * Set a payout method as default.
     */
    public function setDefault(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $method = $user->payoutMethods()->findOrFail($id);

        $user->payoutMethods()->update(['is_default' => false]);
        $method->update(['is_default' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Default payout method updated.',
            'data' => $method,
        ]);
    }

    /**
     * Delete a payout method.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $method = $request->user()->payoutMethods()->findOrFail($id);
        $wasDefault = $method->is_default;
        $method->delete();

        // If the deleted one was default, set another one as default if exists
        if ($wasDefault) {
            $firstRemaining = $request->user()->payoutMethods()->first();
            if ($firstRemaining) {
                $firstRemaining->update(['is_default' => true]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Payout method removed successfully.',
        ]);
    }
}
