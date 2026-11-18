<?php

namespace App\Http\Controllers;

use App\Models\Property;
use App\Models\PropertyImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PropertyImageController extends Controller
{
    /**
     * Upload photos for a property (Host protected).
     */
    public function upload(Request $request, int $propertyId): JsonResponse
    {
        $property = Property::where('host_id', $request->user()->id)->findOrFail($propertyId);

        $request->validate([
            'images' => ['required', 'array', 'min:1'],
            'images.*' => ['image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
        ]);

        $uploaded = [];
        $hasPrimary = $property->images()->where('is_primary', true)->exists();

        foreach ($request->file('images') as $index => $file) {
            $path = $file->store('property_images', 'public');
            $isPrimary = (!$hasPrimary && $index === 0);

            $img = $property->images()->create([
                'image_path' => $path,
                'is_primary' => $isPrimary,
                'sort_order' => $property->images()->count(),
            ]);

            $uploaded[] = $img;
            if ($isPrimary) $hasPrimary = true;
        }

        return response()->json([
            'success' => true,
            'message' => 'Images uploaded successfully.',
            'data' => $property->load('images'),
        ], 201);
    }

    /**
     * Set an image as cover/primary (Host protected).
     */
    public function setPrimary(Request $request, int $propertyId, int $imageId): JsonResponse
    {
        $property = Property::where('host_id', $request->user()->id)->findOrFail($propertyId);
        $image = $property->images()->findOrFail($imageId);

        $property->images()->update(['is_primary' => false]);
        $image->update(['is_primary' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Cover photo updated.',
            'data' => $property->load('images'),
        ]);
    }

    /**
     * Delete an image (Host protected).
     */
    public function destroy(Request $request, int $propertyId, int $imageId): JsonResponse
    {
        $property = Property::where('host_id', $request->user()->id)->findOrFail($propertyId);
        $image = $property->images()->findOrFail($imageId);

        if (Storage::disk('public')->exists($image->image_path)) {
            Storage::disk('public')->delete($image->image_path);
        }

        $wasPrimary = $image->is_primary;
        $image->delete();

        // If primary was deleted, assign to next available image
        if ($wasPrimary) {
            $next = $property->images()->first();
            if ($next) $next->update(['is_primary' => true]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Image deleted successfully.',
            'data' => $property->load('images'),
        ]);
    }
}