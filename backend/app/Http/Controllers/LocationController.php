<?php

namespace App\Http\Controllers;

use App\Models\Country;
use App\Models\State;
use App\Models\City;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LocationController extends Controller
{
    /**
     * Get lightweight location hierarchy tree for cascaded dropdown selectors.
     */
    public function hierarchy(): JsonResponse
    {
        $countries = Country::where('is_active', true)
            ->with([
                'states' => fn($q) => $q->where('is_active', true)->select('id', 'country_id', 'name', 'code', 'latitude', 'longitude'),
                'states.cities' => fn($q) => $q->where('is_active', true)->select('id', 'country_id', 'state_id', 'name', 'latitude', 'longitude'),
            ])
            ->select('id', 'name', 'code', 'currency', 'latitude', 'longitude')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $countries,
        ]);
    }

    /**
     * Unified location auto-complete search across Country, State, and City.
     */
    public function search(Request $request): JsonResponse
    {
        $query = trim($request->input('q', ''));
        if (strlen($query) < 2) {
            return response()->json([
                'success' => true,
                'data' => [],
            ]);
        }

        $results = [];

        // 1. Search Cities
        $cities = City::where('is_active', true)
            ->where('name', 'like', "{$query}%")
            ->with(['country:id,name,code', 'state:id,name,code'])
            ->limit(5)
            ->get();

        foreach ($cities as $city) {
            $results[] = [
                'type' => 'city',
                'id' => $city->id,
                'city_id' => $city->id,
                'state_id' => $city->state_id,
                'country_id' => $city->country_id,
                'title' => "{$city->name}, " . ($city->state ? "{$city->state->name}, " : "") . "{$city->country->name}",
                'name' => $city->name,
                'latitude' => $city->latitude,
                'longitude' => $city->longitude,
            ];
        }

        // 2. Search States
        $states = State::where('is_active', true)
            ->where('name', 'like', "{$query}%")
            ->with('country:id,name,code')
            ->limit(3)
            ->get();

        foreach ($states as $state) {
            $results[] = [
                'type' => 'state',
                'id' => $state->id,
                'state_id' => $state->id,
                'country_id' => $state->country_id,
                'title' => "{$state->name}, {$state->country->name}",
                'name' => $state->name,
                'latitude' => $state->latitude,
                'longitude' => $state->longitude,
            ];
        }

        // 3. Search Countries
        $countries = Country::where('is_active', true)
            ->where('name', 'like', "{$query}%")
            ->limit(3)
            ->get();

        foreach ($countries as $country) {
            $results[] = [
                'type' => 'country',
                'id' => $country->id,
                'country_id' => $country->id,
                'title' => $country->name,
                'name' => $country->name,
                'latitude' => $country->latitude,
                'longitude' => $country->longitude,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $results,
        ]);
    }

    /**
     * Validate full location hierarchy and coordinates before listing save.
     */
    public function validateLocation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'country_id' => ['required', 'integer', 'exists:countries,id'],
            'state_id' => ['nullable', 'integer', 'exists:states,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'address' => ['required', 'string', 'max:255'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $errors = [];

        $country = Country::find($validated['country_id']);
        if (!$country || !$country->is_active) {
            $errors['country_id'] = ['The selected country is currently not active for listings.'];
        }

        $state = null;
        if (!empty($validated['state_id'])) {
            $state = State::where('id', $validated['state_id'])
                ->where('country_id', $validated['country_id'])
                ->first();

            if (!$state) {
                $errors['state_id'] = ['The selected state/province does not belong to the selected country.'];
            }
        }

        $city = null;
        if (!empty($validated['city_id'])) {
            $cityQuery = City::where('id', $validated['city_id'])
                ->where('country_id', $validated['country_id']);

            if (!empty($validated['state_id'])) {
                $cityQuery->where('state_id', $validated['state_id']);
            }

            $city = $cityQuery->first();

            if (!$city) {
                $errors['city_id'] = ['The selected city does not match the chosen country and state hierarchy.'];
            }
        }

        // Validate Coordinates
        if (isset($validated['latitude']) xor isset($validated['longitude'])) {
            $errors['coordinates'] = ['Both latitude and longitude must be provided together.'];
        }

        if (!empty($errors)) {
            return response()->json([
                'success' => false,
                'message' => 'Location validation failed.',
                'errors' => $errors,
            ], 422);
        }

        $formattedAddress = "{$validated['address']}, " .
            ($city ? "{$city->name}, " : "") .
            ($state ? "{$state->name}, " : "") .
            $country->name .
            (!empty($validated['postal_code']) ? " {$validated['postal_code']}" : "");

        return response()->json([
            'success' => true,
            'message' => 'Location is valid.',
            'data' => [
                'country' => $country->name,
                'state' => $state?->name,
                'city' => $city?->name,
                'formatted_address' => $formattedAddress,
                'latitude' => $validated['latitude'] ?? $city?->latitude ?? $country->latitude,
                'longitude' => $validated['longitude'] ?? $city?->longitude ?? $country->longitude,
            ],
        ]);
    }

    /**
     * Get top featured/popular cities for homepage explore widgets.
     */
    public function popularDestinations(): JsonResponse
    {
        $popular = City::where('is_active', true)
            ->where('is_popular', true)
            ->with(['country:id,name,code', 'state:id,name,code'])
            ->withCount(['properties' => fn($q) => $q->where('status', 'published')])
            ->orderByDesc('properties_count')
            ->limit(8)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $popular,
        ]);
    }
}
