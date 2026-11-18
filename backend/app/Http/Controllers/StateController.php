<?php

namespace App\Http\Controllers;

use App\Models\State;
use App\Models\Country;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StateController extends Controller
{
    /**
     * List states (Public & Admin).
     */
    public function index(Request $request): JsonResponse
    {
        $query = State::with('country:id,name,code');

        if (!$request->boolean('all')) {
            $query->where('is_active', true);
        }

        if ($countryId = $request->input('country_id')) {
            $query->where('country_id', $countryId);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $states = $query->withCount(['cities', 'properties'])
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $states,
        ]);
    }

    /**
     * List states of a specific country.
     */
    public function byCountry(int $countryId, Request $request): JsonResponse
    {
        $query = State::where('country_id', $countryId);

        if (!$request->boolean('all')) {
            $query->where('is_active', true);
        }

        $states = $query->withCount('cities')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $states,
        ]);
    }

    /**
     * Show single state with its cities.
     */
    public function show(int $id): JsonResponse
    {
        $state = State::with([
            'country',
            'cities' => fn($q) => $q->where('is_active', true)->orderBy('name'),
        ])
        ->withCount('properties')
        ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $state,
        ]);
    }

    /**
     * Create state (Admin only).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'country_id' => ['required', 'exists:countries,id'],
            'name' => ['required', 'string', 'max:100'],
            'code' => ['nullable', 'string', 'max:10'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        // Ensure unique state name within country
        $exists = State::where('country_id', $validated['country_id'])
            ->where('name', $validated['name'])
            ->exists();

        if ($exists) {
            return response()->json([
                'success' => false,
                'message' => 'A state/province with this name already exists in the selected country.',
            ], 422);
        }

        $state = State::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'State created successfully.',
            'data' => $state->load('country:id,name,code'),
        ], 201);
    }

    /**
     * Update state (Admin only).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $state = State::findOrFail($id);

        $validated = $request->validate([
            'country_id' => ['sometimes', 'required', 'exists:countries,id'],
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'code' => ['nullable', 'string', 'max:10'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $countryId = $validated['country_id'] ?? $state->country_id;
        $name = $validated['name'] ?? $state->name;

        $duplicate = State::where('country_id', $countryId)
            ->where('name', $name)
            ->where('id', '!=', $id)
            ->exists();

        if ($duplicate) {
            return response()->json([
                'success' => false,
                'message' => 'Another state/province in this country already uses that name.',
            ], 422);
        }

        $state->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'State updated successfully.',
            'data' => $state->load('country:id,name,code'),
        ]);
    }

    /**
     * Delete state (Admin only).
     */
    public function destroy(int $id): JsonResponse
    {
        $state = State::withCount('properties')->findOrFail($id);

        if ($state->properties_count > 0) {
            return response()->json([
                'success' => false,
                'message' => "Cannot delete {$state->name} because {$state->properties_count} properties are located here.",
            ], 422);
        }

        $state->delete();

        return response()->json([
            'success' => true,
            'message' => 'State deleted successfully.',
        ]);
    }
}
