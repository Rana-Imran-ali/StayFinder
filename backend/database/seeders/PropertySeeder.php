<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use App\Models\User;
use App\Models\Property;
use App\Models\PropertyImage;
use App\Models\Amenity;

class PropertySeeder extends Seeder
{
    public function run(): void
    {
        $host = User::where('email', 'alex_host@stayfinder.com')->first() ?: User::first();
        if (!$host) {
            return;
        }

        $amenities = Amenity::all();

        $propertiesData = [
            [
                'title' => 'Cliffside Oceanfront Villa with Infinity Pool',
                'description' => "Perched high on the rugged cliffs of the Amalfi Coast, this breathtaking luxury villa offers uninterrupted 180-degree Mediterranean panoramas. Features private infinity pool, sun deck, open-concept chef kitchen, and master suite with floor-to-ceiling glass doors opening onto the sea breeze.\n\nEnjoy secluded sunset dinners, bespoke concierge services, and rapid access to private cove beaches.",
                'property_type' => 'villa',
                'room_type' => 'entire_place',
                'price_per_night' => 380,
                'cleaning_fee' => 60,
                'currency' => 'USD',
                'address' => 'Via Panoramica 42',
                'city' => 'Positano',
                'state' => 'Salerno',
                'country' => 'Italy',
                'postal_code' => '84017',
                'max_guests' => 6,
                'bedrooms' => 3,
                'beds' => 4,
                'bathrooms' => 3.5,
                'status' => 'published',
                'instant_bookable' => true,
                'cancellation_policy' => 'flexible',
                'images' => [
                    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
                ],
            ],
            [
                'title' => 'Modern Alpine Glass Cabin with Glacier Views',
                'description' => "Escape to this architectural marvel nestled in the Swiss Alps near Zermatt. Featuring soaring timber beams, Nordic wood-burning fireplace, and heated oak floors, this cabin provides the ultimate cozy sanctuary after a day on the slopes.\n\nIncludes private sauna, outdoor hot tub, heated ski storage, and panoramic floor-to-ceiling views of the Matterhorn.",
                'property_type' => 'cabin',
                'room_type' => 'entire_place',
                'price_per_night' => 295,
                'cleaning_fee' => 45,
                'currency' => 'USD',
                'address' => 'Matterhornweg 18',
                'city' => 'Zermatt',
                'state' => 'Valais',
                'country' => 'Switzerland',
                'postal_code' => '3920',
                'max_guests' => 4,
                'bedrooms' => 2,
                'beds' => 2,
                'bathrooms' => 2.0,
                'status' => 'published',
                'instant_bookable' => true,
                'cancellation_policy' => 'moderate',
                'images' => [
                    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80',
                ],
            ],
            [
                'title' => 'Santorini Sunset Cave Suite in Oia',
                'description' => "Authentic whitewashed cave house carved into the caldera cliff face in the heart of Oia. Offering an expansive private veranda overlooking the Aegean Sea, private heated plunge pool, minimalist Cycladic architecture, and the most celebrated sunset spot on the island.\n\nComplimentary breakfast delivered to your terrace every morning.",
                'property_type' => 'apartment',
                'room_type' => 'entire_place',
                'price_per_night' => 420,
                'cleaning_fee' => 50,
                'currency' => 'USD',
                'address' => 'Caldera Walk 88',
                'city' => 'Oia',
                'state' => 'Santorini',
                'country' => 'Greece',
                'postal_code' => '84702',
                'max_guests' => 3,
                'bedrooms' => 1,
                'beds' => 2,
                'bathrooms' => 1.5,
                'status' => 'published',
                'instant_bookable' => false,
                'cancellation_policy' => 'strict',
                'images' => [
                    'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
                ],
            ],
            [
                'title' => 'Downtown Skyline Loft with Designer Finishes',
                'description' => "Immerse yourself in urban luxury in this industrial chic loft with 16-foot exposed brick ceilings, polished concrete floors, and designer mid-century modern furnishings. Located steps from premier art galleries, Michelin-starred dining, and transit.\n\nUltra-fast fiber internet, dedicated workstation, espresso bar, and rooftop pool access.",
                'property_type' => 'loft',
                'room_type' => 'entire_place',
                'price_per_night' => 185,
                'cleaning_fee' => 30,
                'currency' => 'USD',
                'address' => '450 Spring Street, Suite 9B',
                'city' => 'Los Angeles',
                'state' => 'California',
                'country' => 'United States',
                'postal_code' => '90013',
                'max_guests' => 2,
                'bedrooms' => 1,
                'beds' => 1,
                'bathrooms' => 1.0,
                'status' => 'published',
                'instant_bookable' => true,
                'cancellation_policy' => 'flexible',
                'images' => [
                    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1502005229762-ee1b2b800539?auto=format&fit=crop&w=1200&q=80',
                ],
            ],
        ];

        foreach ($propertiesData as $data) {
            $images = $data['images'];
            unset($data['images']);

            $slug = Str::slug($data['title']);
            $count = Property::where('slug', 'like', "{$slug}%")->count();
            if ($count > 0) {
                $slug = "{$slug}-" . ($count + 1);
            }

            $property = Property::create(array_merge($data, [
                'host_id' => $host->id,
                'slug' => $slug,
            ]));

            // Attach random 4-8 amenities
            if ($amenities->isNotEmpty()) {
                $randomAmenities = $amenities->random(min(6, $amenities->count()))->pluck('id');
                $property->amenities()->attach($randomAmenities);
            }

            // Create images
            foreach ($images as $index => $imageUrl) {
                PropertyImage::create([
                    'property_id' => $property->id,
                    'image_path' => $imageUrl,
                    'caption' => 'Photo ' . ($index + 1),
                    'sort_order' => $index,
                    'is_primary' => ($index === 0),
                ]);
            }
        }
    }
}
