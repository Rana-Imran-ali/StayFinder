<?php

namespace App\Http\Controllers;

use App\Models\Property;
use App\Models\PropertyAvailability;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PropertyAvailabilityController extends Controller
{
    /**
     * Get availability calendar for a property.
     */
    public function index(int $propertyId): JsonResponse
    {
        $availabilities = PropertyAvailability::where('property_id', $propertyId)
            ->where('date', '>=', now()->toDateString())
            ->orderBy('date')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $availabilities,
        ]);
    }

    /**
     * Block / unblock dates or set custom prices (Host protected).
     */
    public function update(Request $request, int $propertyId): JsonResponse
    {
        $property = Property::where('host_id', $request->user()->id)->findOrFail($propertyId);

        $validated = $request->validate([
            'dates' => ['required', 'array', 'min:1'],
            'dates.*' => ['date', 'after_or_equal:today'],
            'is_available' => ['required', 'boolean'],
            'custom_price' => ['nullable', 'numeric', 'min:0'],
            'note' => ['nullable', 'string', 'max:100'],
        ]);

        foreach ($validated['dates'] as $date) {
            PropertyAvailability::updateOrCreate(
                [
                    'property_id' => $property->id,
                    'date' => $date,
                ],
                [
                    'is_available' => $validated['is_available'],
                    'custom_price' => $validated['custom_price'] ?? null,
                    'note' => $validated['note'] ?? null,
                ]
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Calendar availability updated successfully.',
        ]);
    }
}