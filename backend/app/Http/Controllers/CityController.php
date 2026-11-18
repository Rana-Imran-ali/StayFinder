<?php

namespace App\Http\Controllers;

use App\Models\City;
use App\Models\State;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CityController extends Controller
{
    /**
     * List cities (Public & Admin).
     */
    public function index(Request $request): JsonResponse
    {
        $query = City::with(['country:id,name,code', 'state:id,name,code']);

        if (!$request->boolean('all')) {
            $query->where('is_active', true);
        }

        if ($countryId = $request->input('country_id')) {
            $query->where('country_id', $countryId);
        }

        if ($stateId = $request->input('state_id')) {
            $query->where('state_id', $stateId);
        }

        if ($request->boolean('popular')) {
            $query->where('is_popular', true);
        }

        if ($search = $request->input('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        $cities = $query->withCount('properties')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $cities,
        ]);
    }

    /**
     * List cities by state.
     */
    public function byState(int $stateId, Request $request): JsonResponse
    {
        $query = City::where('state_id', $stateId);

        if (!$request->boolean('all')) {
            $query->where('is_active', true);
        }

        $cities = $query->withCount('properties')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $cities,
        ]);
    }

    /**
     * List cities by country.
     */
    public function byCountry(int $countryId, Request $request): JsonResponse
    {
        $query = City::where('country_id', $countryId);

        if (!$request->boolean('all')) {
            $query->where('is_active', true);
        }

        $cities = $query->with('state:id,name')
            ->withCount('properties')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $cities,
        ]);
    }

    /**
     * Show single city details.
     */
    public function show(int $id): JsonResponse
    {
        $city = City::with(['country', 'state'])
            ->withCount('properties')
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $city,
        ]);
    }

    /**
     * Create city (Admin only).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'country_id' => ['required', 'exists:countries,id'],
            'state_id' => ['nullable', 'exists:states,id'],
            'name' => ['required', 'string', 'max:100'],
            'postal_code_pattern' => ['nullable', 'string', 'max:50'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'is_popular' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        // Validate state belongs to selected country
        if (!empty($validated['state_id'])) {
            $stateValid = State::where('id', $validated['state_id'])
                ->where('country_id', $validated['country_id'])
                ->exists();

            if (!$stateValid) {
                return response()->json([
                    'success' => false,
                    'message' => 'The selected state does not belong to the selected country.',
                ], 422);
            }
        }

        $city = City::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'City created successfully.',
            'data' => $city->load(['country:id,name,code', 'state:id,name,code']),
        ], 201);
    }

    /**
     * Update city (Admin only).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $city = City::findOrFail($id);

        $validated = $request->validate([
            'country_id' => ['sometimes', 'required', 'exists:countries,id'],
            'state_id' => ['nullable', 'exists:states,id'],
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'postal_code_pattern' => ['nullable', 'string', 'max:50'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'is_popular' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $countryId = $validated['country_id'] ?? $city->country_id;
        $stateId = array_key_exists('state_id', $validated) ? $validated['state_id'] : $city->state_id;

        if ($stateId) {
            $stateValid = State::where('id', $stateId)
                ->where('country_id', $countryId)
                ->exists();

            if (!$stateValid) {
                return response()->json([
                    'success' => false,
                    'message' => 'The selected state does not belong to the specified country.',
                ], 422);
            }
        }

        $city->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'City updated successfully.',
            'data' => $city->load(['country:id,name,code', 'state:id,name,code']),
        ]);
    }

    /**
     * Delete city (Admin only).
     */
    public function destroy(int $id): JsonResponse
    {
        $city = City::withCount('properties')->findOrFail($id);

        if ($city->properties_count > 0) {
            return response()->json([
                'success' => false,
                'message' => "Cannot delete {$city->name} because {$city->properties_count} properties are listed here.",
            ], 422);
        }

        $city->delete();

        return response()->json([
            'success' => true,
            'message' => 'City deleted successfully.',
        ]);
    }
}
