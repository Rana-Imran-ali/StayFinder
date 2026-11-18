<?php

namespace App\Http\Controllers;

use App\Models\Country;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CountryController extends Controller
{
    /**
     * List all countries (Public & Admin).
     */
    public function index(Request $request): JsonResponse
    {
        $query = Country::query();

        // If not admin requesting all, return only active countries
        if (!$request->boolean('all')) {
            $query->where('is_active', true);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $countries = $query->withCount(['states', 'cities', 'properties'])
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $countries,
        ]);
    }

    /**
     * Get single country details with its states.
     */
    public function show(int $id): JsonResponse
    {
        $country = Country::with(['states' => fn($q) => $q->where('is_active', true)->orderBy('name')])
            ->withCount(['properties', 'cities'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $country,
        ]);
    }

    /**
     * Create new country (Admin only).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:countries,name'],
            'code' => ['required', 'string', 'max:3', 'uppercase', 'unique:countries,code'],
            'phone_code' => ['nullable', 'string', 'max:10'],
            'currency' => ['nullable', 'string', 'max:10'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $country = Country::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Country created successfully.',
            'data' => $country,
        ], 201);
    }

    /**
     * Update country (Admin only).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $country = Country::findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100', "unique:countries,name,{$id}"],
            'code' => ['sometimes', 'required', 'string', 'max:3', 'uppercase', "unique:countries,code,{$id}"],
            'phone_code' => ['nullable', 'string', 'max:10'],
            'currency' => ['nullable', 'string', 'max:10'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $country->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Country updated successfully.',
            'data' => $country,
        ]);
    }

    /**
     * Delete country (Admin only).
     */
    public function destroy(int $id): JsonResponse
    {
        $country = Country::withCount('properties')->findOrFail($id);

        if ($country->properties_count > 0) {
            return response()->json([
                'success' => false,
                'message' => "Cannot delete {$country->name} because it has {$country->properties_count} associated properties.",
            ], 422);
        }

        $country->delete();

        return response()->json([
            'success' => true,
            'message' => 'Country deleted successfully.',
        ]);
    }
}
