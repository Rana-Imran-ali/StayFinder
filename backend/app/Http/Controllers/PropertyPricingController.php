<?php

namespace App\Http\Controllers;

use App\Models\Property;
use App\Models\PropertySeasonalPrice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PropertyPricingController extends Controller
{
    /**
     * GET /api/host/properties/{id}/pricing
     * Retrieve base pricing and stay rules for a property.
     */
    public function getPricingRules(Request $request, int $id): JsonResponse
    {
        $property = Property::where('host_id', $request->user()->id)->findOrFail($id);

        $rules = [
            'property_id'              => $property->id,
            'price_per_night'          => (float) $property->price_per_night,
            'weekend_price'            => $property->weekend_price ? (float) $property->weekend_price : null,
            'cleaning_fee'             => (float) ($property->cleaning_fee ?? 0),
            'extra_guest_fee'          => (float) ($property->extra_guest_fee ?? 0),
            'extra_guest_threshold'    => (int) ($property->extra_guest_threshold ?? 2),
            'pet_fee'                  => (float) ($property->pet_fee ?? 0),
            'security_deposit'         => (float) ($property->security_deposit ?? 0),
            'weekly_discount_percent'  => (float) ($property->weekly_discount_percent ?? 0),
            'monthly_discount_percent' => (float) ($property->monthly_discount_percent ?? 0),
            'tax_percent'              => (float) ($property->tax_percent ?? 0),
            'min_nights'               => (int) ($property->min_nights ?? 1),
            'max_nights'               => (int) ($property->max_nights ?? 365),
            'currency'                 => $property->currency ?? 'USD',
        ];

        return response()->json([
            'success' => true,
            'data'    => $rules,
        ]);
    }

    /**
     * PUT /api/host/properties/{id}/pricing
     * Update base pricing rules and fees for a property.
     */
    public function updatePricingRules(Request $request, int $id): JsonResponse
    {
        $property = Property::where('host_id', $request->user()->id)->findOrFail($id);

        $validated = $request->validate([
            'price_per_night'          => ['sometimes', 'required', 'numeric', 'min:1'],
            'weekend_price'            => ['nullable', 'numeric', 'min:0'],
            'cleaning_fee'             => ['nullable', 'numeric', 'min:0'],
            'extra_guest_fee'          => ['nullable', 'numeric', 'min:0'],
            'extra_guest_threshold'    => ['nullable', 'integer', 'min:1'],
            'pet_fee'                  => ['nullable', 'numeric', 'min:0'],
            'security_deposit'         => ['nullable', 'numeric', 'min:0'],
            'weekly_discount_percent'  => ['nullable', 'numeric', 'between:0,100'],
            'monthly_discount_percent' => ['nullable', 'numeric', 'between:0,100'],
            'tax_percent'              => ['nullable', 'numeric', 'between:0,100'],
            'min_nights'               => ['nullable', 'integer', 'min:1'],
            'max_nights'               => ['nullable', 'integer', 'min:1'],
            'currency'                 => ['nullable', 'string', 'max:10'],
        ]);

        $property->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Pricing rules updated successfully.',
            'data'    => $property->fresh(),
        ]);
    }

    /**
     * GET /api/host/properties/{id}/seasonal-prices
     * List all seasonal pricing rules for a property.
     */
    public function getSeasonalPrices(Request $request, int $id): JsonResponse
    {
        $property = Property::where('host_id', $request->user()->id)->findOrFail($id);

        $rules = PropertySeasonalPrice::where('property_id', $property->id)
            ->orderBy('start_date')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $rules,
        ]);
    }

    /**
     * POST /api/host/properties/{id}/seasonal-prices
     * Create a new seasonal pricing rule.
     */
    public function storeSeasonalPrice(Request $request, int $id): JsonResponse
    {
        $property = Property::where('host_id', $request->user()->id)->findOrFail($id);

        $validated = $request->validate([
            'name'            => ['required', 'string', 'max:100'],
            'start_date'      => ['required', 'date'],
            'end_date'        => ['required', 'date', 'after_or_equal:start_date'],
            'price_per_night' => ['required', 'numeric', 'min:1'],
            'weekend_price'   => ['nullable', 'numeric', 'min:0'],
            'min_nights'      => ['nullable', 'integer', 'min:1'],
            'is_active'       => ['nullable', 'boolean'],
        ]);

        $validated['property_id'] = $property->id;
        $validated['is_active']   = $validated['is_active'] ?? true;

        $rule = PropertySeasonalPrice::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Seasonal pricing rule created successfully.',
            'data'    => $rule,
        ], 201);
    }

    /**
     * PUT /api/host/properties/{id}/seasonal-prices/{ruleId}
     * Update an existing seasonal pricing rule.
     */
    public function updateSeasonalPrice(Request $request, int $id, int $ruleId): JsonResponse
    {
        $property = Property::where('host_id', $request->user()->id)->findOrFail($id);

        $rule = PropertySeasonalPrice::where('property_id', $property->id)->findOrFail($ruleId);

        $validated = $request->validate([
            'name'            => ['sometimes', 'required', 'string', 'max:100'],
            'start_date'      => ['sometimes', 'required', 'date'],
            'end_date'        => ['sometimes', 'required', 'date', 'after_or_equal:start_date'],
            'price_per_night' => ['sometimes', 'required', 'numeric', 'min:1'],
            'weekend_price'   => ['nullable', 'numeric', 'min:0'],
            'min_nights'      => ['nullable', 'integer', 'min:1'],
            'is_active'       => ['nullable', 'boolean'],
        ]);

        $rule->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Seasonal pricing rule updated successfully.',
            'data'    => $rule->fresh(),
        ]);
    }

    /**
     * DELETE /api/host/properties/{id}/seasonal-prices/{ruleId}
     * Remove a seasonal pricing rule.
     */
    public function destroySeasonalPrice(Request $request, int $id, int $ruleId): JsonResponse
    {
        $property = Property::where('host_id', $request->user()->id)->findOrFail($id);

        $rule = PropertySeasonalPrice::where('property_id', $property->id)->findOrFail($ruleId);
        $rule->delete();

        return response()->json([
            'success' => true,
            'message' => 'Seasonal pricing rule deleted successfully.',
        ]);
    }
}
