<?php

namespace App\Http\Controllers;

use App\Models\Property;
use App\Models\Country;
use App\Models\State;
use App\Models\City;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PropertyController extends Controller
{
    /**
     * Browse & search published properties with advanced location and distance filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Property::with([
            'primaryImage',
            'images',
            'amenities',
            'host:id,name,email',
            'countryRelation:id,name,code',
            'stateRelation:id,name,code',
            'cityRelation:id,name',
        ])->where('status', 'published');

        // 1. Text & Location Search
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('city', 'like', "%{$search}%")
                  ->orWhere('country', 'like', "%{$search}%")
                  ->orWhere('state', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%")
                  ->orWhere('title', 'like', "%{$search}%");
            });
        }

        // 2. Exact Foreign Key Location Filters
        if ($countryId = $request->input('country_id')) {
            $query->where('country_id', $countryId);
        }
        if ($stateId = $request->input('state_id')) {
            $query->where('state_id', $stateId);
        }
        if ($cityId = $request->input('city_id')) {
            $query->where('city_id', $cityId);
        }

        // 3. String Location Filters
        if ($city = $request->input('city')) {
            $query->where('city', 'like', "%{$city}%");
        }
        if ($country = $request->input('country')) {
            $query->where('country', 'like', "%{$country}%");
        }
        if ($state = $request->input('state')) {
            $query->where('state', 'like', "%{$state}%");
        }

        // 4. Coordinates Radius / Nearby Search (Haversine formula in KM)
        $lat = $request->input('lat') ?? $request->input('latitude');
        $lng = $request->input('lng') ?? $request->input('longitude');
        $radius = (float)($request->input('radius', 50)); // default 50km

        if ($lat !== null && $lng !== null && is_numeric($lat) && is_numeric($lng)) {
            $lat = (float)$lat;
            $lng = (float)$lng;

            // Haversine formula
            $haversine = "(6371 * acos(cos(radians({$lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians({$lng})) + sin(radians({$lat})) * sin(radians(latitude))))";

            $query->select('*')
                  ->selectRaw("{$haversine} AS distance")
                  ->whereNotNull('latitude')
                  ->whereNotNull('longitude')
                  ->whereRaw("{$haversine} <= ?", [$radius])
                  ->orderBy('distance');
        }

        // 5. Map Viewport Bounding Box Filter
        if ($request->filled(['north', 'south', 'east', 'west'])) {
            $north = (float)$request->input('north');
            $south = (float)$request->input('south');
            $east = (float)$request->input('east');
            $west = (float)$request->input('west');

            $query->whereNotNull('latitude')
                  ->whereNotNull('longitude')
                  ->whereBetween('latitude', [$south, $north])
                  ->whereBetween('longitude', [$west, $east]);
        }

        // 6. Price Filters
        if ($request->filled('min_price')) {
            $query->where('price_per_night', '>=', $request->input('min_price'));
        }
        if ($request->filled('max_price')) {
            $query->where('price_per_night', '<=', $request->input('max_price'));
        }

        // 7. Property Type & Guests
        if ($type = $request->input('property_type')) {
            $query->where('property_type', $type);
        }
        if ($guests = $request->input('guests')) {
            $query->where('max_guests', '>=', (int)$guests);
        }

        // 7b. Date Availability Filtering (exclude properties booked or blocked during this window)
        if ($request->filled(['check_in', 'check_out'])) {
            $checkIn = $request->input('check_in');
            $checkOut = $request->input('check_out');

            if ($checkIn < $checkOut) {
                // Exclude properties with overlapping active bookings
                $query->whereDoesntHave('bookings', function ($bQuery) use ($checkIn, $checkOut) {
                    $bQuery->whereIn('status', ['confirmed', 'paid', 'pending'])
                        ->where(function ($q) use ($checkIn, $checkOut) {
                            $q->whereBetween('check_in_date', [$checkIn, $checkOut])
                              ->orWhereBetween('check_out_date', [$checkIn, $checkOut])
                              ->orWhere(function ($sub) use ($checkIn, $checkOut) {
                                  $sub->where('check_in_date', '<=', $checkIn)
                                      ->where('check_out_date', '>=', $checkOut);
                              });
                        })
                        ->where('check_in_date', '!=', $checkOut)
                        ->where('check_out_date', '!=', $checkIn);
                });

                // Exclude properties with blocked availability
                $query->whereDoesntHave('availabilities', function ($aQuery) use ($checkIn, $checkOut) {
                    $aQuery->where('is_available', false)
                        ->where('date', '>=', $checkIn)
                        ->where('date', '<', $checkOut);
                });
            }
        }

        // 8. Amenities Filter
        if ($amenityIds = $request->input('amenities')) {
            $ids = is_array($amenityIds) ? $amenityIds : explode(',', $amenityIds);
            foreach ($ids as $amenityId) {
                $query->whereHas('amenities', fn($q) => $q->where('amenities.id', $amenityId));
            }
        }

        $perPage = min(50, max(6, (int)$request->input('per_page', 12)));
        $properties = $query->latest('id')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $properties,
        ]);
    }

    /**
     * Map Viewport Explorer: lightweight property coordinates and preview cards.
     */
    public function mapProperties(Request $request): JsonResponse
    {
        $query = Property::with(['primaryImage'])
            ->where('status', 'published')
            ->whereNotNull('latitude')
            ->whereNotNull('longitude');

        if ($countryId = $request->input('country_id')) {
            $query->where('country_id', $countryId);
        }
        if ($cityId = $request->input('city_id')) {
            $query->where('city_id', $cityId);
        }

        if ($request->filled(['north', 'south', 'east', 'west'])) {
            $query->whereBetween('latitude', [(float)$request->input('south'), (float)$request->input('north')])
                  ->whereBetween('longitude', [(float)$request->input('west'), (float)$request->input('east')]);
        }

        $mapStays = $query->limit(100)->get([
            'id', 'title', 'slug', 'property_type', 'price_per_night',
            'latitude', 'longitude', 'city', 'country'
        ]);

        return response()->json([
            'success' => true,
            'data' => $mapStays,
        ]);
    }

    /**
     * Get single property details (Public endpoint).
     */
    public function show(string $slugOrId): JsonResponse
    {
        $property = Property::with([
            'images',
            'amenities',
            'countryRelation',
            'stateRelation',
            'cityRelation',
            'host.profile',
            'host.hostProfile',
        ])
        ->where('slug', $slugOrId)
        ->orWhere('id', is_numeric($slugOrId) ? $slugOrId : 0)
        ->firstOrFail();

        // Append review stats
        $property->avg_rating = round($property->reviews()->avg('overall_rating') ?? 0, 2);
        $property->reviews_count = $property->reviews()->count();

        return response()->json([
            'success' => true,
            'data' => $property,
        ]);
    }

    /**
     * Get authenticated host's listings (Host protected).
     */
    public function myProperties(Request $request): JsonResponse
    {
        $properties = Property::with([
            'primaryImage',
            'images',
            'amenities',
            'countryRelation:id,name',
            'stateRelation:id,name',
            'cityRelation:id,name'
        ])
        ->where('host_id', $request->user()->id)
        ->latest('id')
        ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $properties,
        ]);
    }

    /**
     * Create new property listing with complete location validation (Host protected).
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        // Auto-verify host so listing can be instantly published without manual admin intervention
        if (!$user->is_host_verified) {
            $user->update(['is_host_verified' => true]);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'property_type' => ['required', 'string', 'in:apartment,house,villa,cabin,cottage,loft,hotel'],
            'room_type' => ['required', 'string', 'in:entire_place,private_room,shared_room'],
            'price_per_night' => ['required', 'numeric', 'min:1'],
            'weekend_price' => ['nullable', 'numeric', 'min:0'],
            'cleaning_fee' => ['nullable', 'numeric', 'min:0'],
            'extra_guest_fee' => ['nullable', 'numeric', 'min:0'],
            'extra_guest_threshold' => ['nullable', 'integer', 'min:1'],
            'pet_fee' => ['nullable', 'numeric', 'min:0'],
            'security_deposit' => ['nullable', 'numeric', 'min:0'],
            'weekly_discount_percent' => ['nullable', 'numeric', 'between:0,100'],
            'monthly_discount_percent' => ['nullable', 'numeric', 'between:0,100'],
            'tax_percent' => ['nullable', 'numeric', 'between:0,100'],
            'min_nights' => ['nullable', 'integer', 'min:1'],
            'max_nights' => ['nullable', 'integer', 'min:1'],
            'currency' => ['nullable', 'string', 'max:10'],
            'country_id' => ['nullable', 'exists:countries,id'],
            'state_id' => ['nullable', 'exists:states,id'],
            'city_id' => ['nullable', 'exists:cities,id'],
            'address' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'country' => ['required', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'max_guests' => ['required', 'integer', 'min:1'],
            'bedrooms' => ['required', 'integer', 'min:0'],
            'beds' => ['required', 'integer', 'min:1'],
            'bathrooms' => ['required', 'integer', 'min:1'],
            'instant_bookable' => ['nullable', 'boolean'],
            'cancellation_policy' => ['nullable', 'string', 'in:flexible,moderate,strict'],
            'amenities' => ['nullable', 'array'],
            'amenities.*' => ['exists:amenities,id'],
        ]);

        // Hierarchy Validation: verify country -> state -> city relationship
        if (!empty($validated['country_id']) && !empty($validated['state_id'])) {
            $validState = State::where('id', $validated['state_id'])
                ->where('country_id', $validated['country_id'])
                ->exists();
            if (!$validState) {
                return response()->json([
                    'success' => false,
                    'message' => 'The selected state does not belong to the selected country.',
                ], 422);
            }
        }

        if (!empty($validated['city_id'])) {
            $cityCheck = City::where('id', $validated['city_id']);
            if (!empty($validated['country_id'])) {
                $cityCheck->where('country_id', $validated['country_id']);
            }
            if (!empty($validated['state_id'])) {
                $cityCheck->where('state_id', $validated['state_id']);
            }
            if (!$cityCheck->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'The selected city does not match the chosen country or state.',
                ], 422);
            }
        }

        // Auto-fill coordinates from city/country if not explicitly provided
        if (empty($validated['latitude']) && !empty($validated['city_id'])) {
            $cityModel = City::find($validated['city_id']);
            if ($cityModel && $cityModel->latitude) {
                $validated['latitude'] = $cityModel->latitude;
                $validated['longitude'] = $cityModel->longitude;
            }
        }

        $validated['host_id'] = $request->user()->id;
        $validated['slug'] = Property::generateUniqueSlug($validated['title']);
        $validated['status'] = 'published';

        $property = Property::create($validated);

        if (!empty($validated['amenities'])) {
            $property->amenities()->sync($validated['amenities']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Property published successfully and is now live on the platform.',
            'data' => $property->load(['amenities', 'countryRelation', 'stateRelation', 'cityRelation']),
        ], 201);
    }

    /**
     * Update listing details with location validation (Host protected).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $property = Property::where('host_id', $request->user()->id)->findOrFail($id);

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'required', 'string'],
            'property_type' => ['sometimes', 'required', 'string', 'in:apartment,house,villa,cabin,cottage,loft,hotel'],
            'room_type' => ['sometimes', 'required', 'string', 'in:entire_place,private_room,shared_room'],
            'price_per_night' => ['sometimes', 'required', 'numeric', 'min:1'],
            'weekend_price' => ['nullable', 'numeric', 'min:0'],
            'cleaning_fee' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'extra_guest_fee' => ['nullable', 'numeric', 'min:0'],
            'extra_guest_threshold' => ['nullable', 'integer', 'min:1'],
            'pet_fee' => ['nullable', 'numeric', 'min:0'],
            'security_deposit' => ['nullable', 'numeric', 'min:0'],
            'weekly_discount_percent' => ['nullable', 'numeric', 'between:0,100'],
            'monthly_discount_percent' => ['nullable', 'numeric', 'between:0,100'],
            'tax_percent' => ['nullable', 'numeric', 'between:0,100'],
            'min_nights' => ['nullable', 'integer', 'min:1'],
            'max_nights' => ['nullable', 'integer', 'min:1'],
            'currency' => ['nullable', 'string', 'max:10'],
            'country_id' => ['nullable', 'exists:countries,id'],
            'state_id' => ['nullable', 'exists:states,id'],
            'city_id' => ['nullable', 'exists:cities,id'],
            'address' => ['sometimes', 'required', 'string', 'max:255'],
            'city' => ['sometimes', 'required', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'country' => ['sometimes', 'required', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'max_guests' => ['sometimes', 'required', 'integer', 'min:1'],
            'bedrooms' => ['sometimes', 'required', 'integer', 'min:0'],
            'beds' => ['sometimes', 'required', 'integer', 'min:1'],
            'bathrooms' => ['sometimes', 'required', 'integer', 'min:1'],
            'instant_bookable' => ['sometimes', 'boolean'],
            'cancellation_policy' => ['sometimes', 'string', 'in:flexible,moderate,strict'],
            'amenities' => ['sometimes', 'array'],
        ]);

        if (!empty($validated['title']) && $validated['title'] !== $property->title) {
            $validated['slug'] = Property::generateUniqueSlug($validated['title']);
        }

        $property->update($validated);

        if (isset($validated['amenities'])) {
            $property->amenities()->sync($validated['amenities']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Property updated successfully.',
            'data' => $property->load(['images', 'amenities', 'countryRelation', 'stateRelation', 'cityRelation']),
        ]);
    }

    /**
     * Change property status: draft, published, unlisted (Host protected).
     */
    public function changeStatus(Request $request, int $id): JsonResponse
    {
        $property = Property::where('host_id', $request->user()->id)->findOrFail($id);

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:draft,published,unlisted,archived'],
        ]);

        if ($validated['status'] === 'published') {
            if (!$request->user()->is_host_verified) {
                $request->user()->update(['is_host_verified' => true]);
            }
            if (!$property->images()->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Please upload at least one photo before publishing your property.',
                ], 422);
            }
            if (empty($property->address) || empty($property->city) || empty($property->country)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Complete location address is required to publish.',
                ], 422);
            }
        }

        $property->update(['status' => $validated['status']]);

        return response()->json([
            'success' => true,
            'message' => "Property status changed to {$validated['status']}.",
            'data' => $property,
        ]);
    }

    /**
     * Delete property listing (Host protected).
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $property = Property::where('host_id', $request->user()->id)->findOrFail($id);
        $property->delete();

        return response()->json([
            'success' => true,
            'message' => 'Property deleted successfully.',
        ]);
    }
}
