<?php

namespace App\Http\Controllers;

use App\Models\Amenity;
use Illuminate\Http\JsonResponse;

class AmenityController extends Controller
{
    /**
     * List all platform amenities grouped by category (Public endpoint).
     */
    public function index(): JsonResponse
    {
        $amenities = Amenity::all()->groupBy('category');

        return response()->json([
            'success' => true,
            'data' => $amenities,
        ]);
    }
}