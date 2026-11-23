<?php

namespace App\Http\Controllers;

use App\Models\Favorite;
use App\Models\Property;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    /**
     * GET /api/favorites
     * List the authenticated user's favorited properties.
     */
    public function index(Request $request): JsonResponse
    {
        $favorites = Favorite::with(['property.images'])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get()
            ->pluck('property')
            ->filter();

        return response()->json(['data' => $favorites]);
    }

    /**
     * POST /api/favorites/{propertyId}/toggle
     * Add if not favorited; remove if already favorited.
     */
    public function toggle(Request $request, int $propertyId): JsonResponse
    {
        $user = $request->user();

        // Ensure property exists
        Property::findOrFail($propertyId);

        $existing = Favorite::where('user_id', $user->id)
            ->where('property_id', $propertyId)
            ->first();

        if ($existing) {
            $existing->delete();
            return response()->json(['is_favorited' => false, 'message' => 'Removed from favorites.']);
        }

        Favorite::create([
            'user_id'     => $user->id,
            'property_id' => $propertyId,
        ]);

        return response()->json(['is_favorited' => true, 'message' => 'Added to favorites.']);
    }

    /**
     * GET /api/favorites/{propertyId}/check
     * Check if the authenticated user has favorited a property.
     */
    public function check(Request $request, int $propertyId): JsonResponse
    {
        $isFavorited = Favorite::where('user_id', $request->user()->id)
            ->where('property_id', $propertyId)
            ->exists();

        return response()->json(['is_favorited' => $isFavorited]);
    }
}
