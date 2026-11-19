<?php

namespace Database\Seeders;

use App\Models\Property;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DummyListingsSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        // ----------------------------------------------------------------
        // Create or find a dedicated Superhost user
        // ----------------------------------------------------------------
        $emmaId = DB::table('users')->where('email', 'emma_host@stayfinder.com')->value('id');

        if (!$emmaId) {
            $emmaId = DB::table('users')->insertGetId([
                'name'                 => 'Emma Williams',
                'email'                => 'emma_host@stayfinder.com',
                'phone'                => '+1 310 555 0192',
                'password'             => bcrypt('password'),
                'status'               => 'active',
                'is_identity_verified' => true,
                'is_host_verified'     => true,
                'email_verified_at'    => $now,
                'created_at'           => $now,
                'updated_at'           => $now,
            ]);

            // Assign host role (role_id = 2) via the pivot table role_user
            $hostRoleId = DB::table('roles')->where('slug', 'host')->value('id') ?? 2;
            DB::table('role_user')->insert([
                'user_id'    => $emmaId,
                'role_id'    => $hostRoleId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // User profile
            DB::table('user_profiles')->insert([
                'user_id'    => $emmaId,
                'bio'        => 'Superhost with 6+ years of hosting experience. Passionate about architecture and hospitality.',
                'city'       => 'Malibu',
                'country'    => 'United States',
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // Host profile matching the host_profiles schema
            DB::table('host_profiles')->insert([
                'user_id'             => $emmaId,
                'business_name'       => 'Emma Williams Signature Escapes',
                'about_host'          => 'Superhost with 6+ years of hosting experience. I love sharing beautiful spaces and creating memorable stays for travellers from around the world.',
                'response_time'       => 'within_an_hour',
                'languages'           => json_encode(['English', 'French', 'Italian']),
                'is_superhost'        => true,
                'cancellation_policy' => 'flexible',
                'check_in_time'       => '15:00',
                'check_out_time'      => '11:00',
                'instant_booking'     => true,
                'created_at'          => $now,
                'updated_at'          => $now,
            ]);
        }

        // ----------------------------------------------------------------
        // 8 Realistic Curated Listings with verified location IDs & images
        // ----------------------------------------------------------------
        $properties = [

            // 1 — Malibu Beachfront House
            [
                'property' => [
                    'host_id'                  => $emmaId,
                    'title'                    => 'Malibu Beachfront Dream Villa',
                    'description'              => 'Wake up to the sound of waves in this stunning Malibu beachfront villa. Floor-to-ceiling panoramic windows offer unobstructed Pacific Ocean views. Features a private sunset deck, heated infinity plunge pool, chef kitchen, and direct sandy beach access.',
                    'property_type'            => 'villa',
                    'room_type'                => 'entire_place',
                    'country_id'               => 1,  // United States
                    'state_id'                 => 1,  // California
                    'city_id'                  => 3,  // San Diego
                    'address'                  => '24100 Pacific Coast Highway',
                    'city'                     => 'Malibu',
                    'state'                    => 'California',
                    'country'                  => 'United States',
                    'postal_code'              => '90265',
                    'latitude'                 => 34.0259,
                    'longitude'                => -118.7798,
                    'price_per_night'          => 450.00,
                    'weekend_price'            => 550.00,
                    'cleaning_fee'             => 120.00,
                    'extra_guest_fee'          => 35.00,
                    'extra_guest_threshold'    => 4,
                    'pet_fee'                  => 50.00,
                    'security_deposit'         => 300.00,
                    'weekly_discount_percent'  => 10.0,
                    'monthly_discount_percent' => 20.0,
                    'tax_percent'              => 10.5,
                    'currency'                 => 'USD',
                    'min_nights'               => 2,
                    'max_nights'               => 30,
                    'max_guests'               => 8,
                    'bedrooms'                 => 4,
                    'beds'                     => 5,
                    'bathrooms'                => 3,
                    'status'                   => 'published',
                    'instant_bookable'         => true,
                    'cancellation_policy'      => 'flexible',
                    'created_at'               => $now,
                    'updated_at'               => $now,
                ],
                'images' => [
                    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
                ],
                'amenities' => [1, 2, 3, 4, 5, 6, 7, 10, 12],
            ],

            // 2 — Manhattan Luxury Penthouse
            [
                'property' => [
                    'host_id'                  => $emmaId,
                    'title'                    => 'Manhattan Luxury Penthouse with Skyline Views',
                    'description'              => 'Live high above Midtown Manhattan in this designer penthouse. Floor-to-ceiling glass reveals breathtaking skyline vistas of Central Park and the Empire State Building. Includes a 360-degree rooftop terrace, 24/7 concierge, gym, and designer furnishings.',
                    'property_type'            => 'apartment',
                    'room_type'                => 'entire_place',
                    'country_id'               => 1,  // United States
                    'state_id'                 => 2,  // New York
                    'city_id'                  => 4,  // New York City
                    'address'                  => '432 Park Avenue, Midtown',
                    'city'                     => 'New York City',
                    'state'                    => 'New York',
                    'country'                  => 'United States',
                    'postal_code'              => '10022',
                    'latitude'                 => 40.7614,
                    'longitude'                => -73.9776,
                    'price_per_night'          => 850.00,
                    'weekend_price'            => 1050.00,
                    'cleaning_fee'             => 200.00,
                    'extra_guest_fee'          => 50.00,
                    'extra_guest_threshold'    => 2,
                    'pet_fee'                  => 0.00,
                    'security_deposit'         => 500.00,
                    'weekly_discount_percent'  => 8.0,
                    'monthly_discount_percent' => 15.0,
                    'tax_percent'              => 8.875,
                    'currency'                 => 'USD',
                    'min_nights'               => 3,
                    'max_nights'               => 14,
                    'max_guests'               => 4,
                    'bedrooms'                 => 2,
                    'beds'                     => 3,
                    'bathrooms'                => 2,
                    'status'                   => 'published',
                    'instant_bookable'         => false,
                    'cancellation_policy'      => 'moderate',
                    'created_at'               => $now,
                    'updated_at'               => $now,
                ],
                'images' => [
                    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1560184897-ae75f418493e?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
                ],
                'amenities' => [1, 2, 3, 4, 5, 6, 8, 10, 11, 12],
            ],

            // 3 — Santorini Cliffside Villa
            [
                'property' => [
                    'host_id'                  => $emmaId,
                    'title'                    => 'Iconic Santorini Cliffside Villa in Oia',
                    'description'              => 'Carved directly into the caldera cliffs, this Cycladic luxury cave villa offers front-row seats to the world-famous Oia sunset. Relax in the private heated cliffside infinity jacuzzi overlooking the sparkling Aegean Sea.',
                    'property_type'            => 'villa',
                    'room_type'                => 'entire_place',
                    'country_id'               => 4,  // Greece
                    'state_id'                 => 11, // South Aegean
                    'city_id'                  => 14, // Oia
                    'address'                  => 'Oia Village Caldera Path',
                    'city'                     => 'Oia',
                    'state'                    => 'South Aegean',
                    'country'                  => 'Greece',
                    'postal_code'              => '84702',
                    'latitude'                 => 36.4618,
                    'longitude'                => 25.3753,
                    'price_per_night'          => 620.00,
                    'weekend_price'            => 750.00,
                    'cleaning_fee'             => 150.00,
                    'extra_guest_fee'          => 40.00,
                    'extra_guest_threshold'    => 2,
                    'pet_fee'                  => 0.00,
                    'security_deposit'         => 400.00,
                    'weekly_discount_percent'  => 12.0,
                    'monthly_discount_percent' => 22.0,
                    'tax_percent'              => 24.0,
                    'currency'                 => 'EUR',
                    'min_nights'               => 3,
                    'max_nights'               => 21,
                    'max_guests'               => 4,
                    'bedrooms'                 => 2,
                    'beds'                     => 2,
                    'bathrooms'                => 2,
                    'status'                   => 'published',
                    'instant_bookable'         => true,
                    'cancellation_policy'      => 'flexible',
                    'created_at'               => $now,
                    'updated_at'               => $now,
                ],
                'images' => [
                    'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1555993539-1732b0258235?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?auto=format&fit=crop&w=1200&q=80',
                ],
                'amenities' => [1, 2, 3, 4, 5, 6, 10, 12],
            ],

            // 4 — Swiss Alps Matterhorn Chalet
            [
                'property' => [
                    'host_id'                  => $emmaId,
                    'title'                    => 'Cozy Swiss Alps Chalet with Matterhorn Views',
                    'description'              => 'A picture-perfect alpine timber chalet in Zermatt with unobstructed Matterhorn views. Warm up by the stone fireplace after a day of powder skiing. Features an outdoor cedar hot tub, sauna, and direct ski-in/ski-out winter trail access.',
                    'property_type'            => 'cabin',
                    'room_type'                => 'entire_place',
                    'country_id'               => 3,  // Switzerland
                    'state_id'                 => 8,  // Valais
                    'city_id'                  => 11, // Zermatt
                    'address'                  => 'Riedweg 45, 3920 Zermatt',
                    'city'                     => 'Zermatt',
                    'state'                    => 'Valais',
                    'country'                  => 'Switzerland',
                    'postal_code'              => '3920',
                    'latitude'                 => 46.0207,
                    'longitude'                => 7.7491,
                    'price_per_night'          => 380.00,
                    'weekend_price'            => 480.00,
                    'cleaning_fee'             => 100.00,
                    'extra_guest_fee'          => 30.00,
                    'extra_guest_threshold'    => 4,
                    'pet_fee'                  => 25.00,
                    'security_deposit'         => 250.00,
                    'weekly_discount_percent'  => 10.0,
                    'monthly_discount_percent' => 18.0,
                    'tax_percent'              => 7.7,
                    'currency'                 => 'CHF',
                    'min_nights'               => 2,
                    'max_nights'               => 28,
                    'max_guests'               => 6,
                    'bedrooms'                 => 3,
                    'beds'                     => 4,
                    'bathrooms'                => 2,
                    'status'                   => 'published',
                    'instant_bookable'         => true,
                    'cancellation_policy'      => 'moderate',
                    'created_at'               => $now,
                    'updated_at'               => $now,
                ],
                'images' => [
                    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1542718610-a1a4c7cb0c95?auto=format&fit=crop&w=1200&q=80',
                ],
                'amenities' => [1, 2, 3, 4, 5, 6, 7, 9, 10, 11],
            ],

            // 5 — Kyoto Traditional Machiya Townhouse
            [
                'property' => [
                    'host_id'                  => $emmaId,
                    'title'                    => 'Authentic Kyoto Machiya with Garden & Onsen Bath',
                    'description'              => 'Step into timeless Japanese beauty in this fully restored 120-year-old Machiya in historic Gion. Tatami-mat tea rooms, shoji paper screens, a tranquil rock and moss garden, and a private hinoki cedar soaking tub. Walking distance to Yasaka Shrine.',
                    'property_type'            => 'house',
                    'room_type'                => 'entire_place',
                    'country_id'               => 5,  // Japan
                    'state_id'                 => 13, // Kyoto Prefecture
                    'city_id'                  => 17, // Kyoto
                    'address'                  => '362 Gion-machi Minamigawa, Higashiyama',
                    'city'                     => 'Kyoto',
                    'state'                    => 'Kyoto Prefecture',
                    'country'                  => 'Japan',
                    'postal_code'              => '605-0074',
                    'latitude'                 => 35.0038,
                    'longitude'                => 135.7781,
                    'price_per_night'          => 290.00,
                    'weekend_price'            => 360.00,
                    'cleaning_fee'             => 80.00,
                    'extra_guest_fee'          => 25.00,
                    'extra_guest_threshold'    => 2,
                    'pet_fee'                  => 0.00,
                    'security_deposit'         => 150.00,
                    'weekly_discount_percent'  => 15.0,
                    'monthly_discount_percent' => 25.0,
                    'tax_percent'              => 10.0,
                    'currency'                 => 'JPY',
                    'min_nights'               => 2,
                    'max_nights'               => 14,
                    'max_guests'               => 4,
                    'bedrooms'                 => 2,
                    'beds'                     => 3,
                    'bathrooms'                => 1,
                    'status'                   => 'published',
                    'instant_bookable'         => false,
                    'cancellation_policy'      => 'strict',
                    'created_at'               => $now,
                    'updated_at'               => $now,
                ],
                'images' => [
                    'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1480796927426-f609979314bd?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80',
                ],
                'amenities' => [1, 2, 4, 5, 10],
            ],

            // 6 — Tuscan Countryside Farmhouse
            [
                'property' => [
                    'host_id'                  => $emmaId,
                    'title'                    => 'Rolling Hills Tuscan Farmhouse with Private Vineyard',
                    'description'              => 'Immerse yourself in quintessential Italian countryside living. This 17th-century restored stone farmhouse overlooks acres of Sangiovese vineyards and olive groves. Features a pergola dining terrace, wood-fired pizza oven, and private saltwater pool.',
                    'property_type'            => 'house',
                    'room_type'                => 'entire_place',
                    'country_id'               => 2,  // Italy
                    'state_id'                 => 7,  // Tuscany
                    'city_id'                  => 10, // Florence
                    'address'                  => 'Via Chiantigiana, Greve in Chianti',
                    'city'                     => 'Florence',
                    'state'                    => 'Tuscany',
                    'country'                  => 'Italy',
                    'postal_code'              => '50022',
                    'latitude'                 => 43.5832,
                    'longitude'                => 11.3119,
                    'price_per_night'          => 320.00,
                    'weekend_price'            => 390.00,
                    'cleaning_fee'             => 90.00,
                    'extra_guest_fee'          => 20.00,
                    'extra_guest_threshold'    => 6,
                    'pet_fee'                  => 30.00,
                    'security_deposit'         => 200.00,
                    'weekly_discount_percent'  => 12.0,
                    'monthly_discount_percent' => 20.0,
                    'tax_percent'              => 22.0,
                    'currency'                 => 'EUR',
                    'min_nights'               => 3,
                    'max_nights'               => 30,
                    'max_guests'               => 10,
                    'bedrooms'                 => 5,
                    'beds'                     => 7,
                    'bathrooms'                => 3,
                    'status'                   => 'published',
                    'instant_bookable'         => true,
                    'cancellation_policy'      => 'flexible',
                    'created_at'               => $now,
                    'updated_at'               => $now,
                ],
                'images' => [
                    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1543349689-9a4d426bee8e?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1416331108676-a22ccb276e35?auto=format&fit=crop&w=1200&q=80',
                ],
                'amenities' => [1, 2, 3, 4, 5, 6, 7, 10, 12],
            ],

            // 7 — Miami South Beach Art Deco Loft
            [
                'property' => [
                    'host_id'                  => $emmaId,
                    'title'                    => 'Miami South Beach Art Deco Loft with Rooftop Pool',
                    'description'              => 'Vibrant Art Deco living just one block from Ocean Drive and turquoise sands. Features high ceilings, modern art curation, ultra-fast fiber WiFi, private balcony, and direct access to a heated rooftop pool and sun deck.',
                    'property_type'            => 'loft',
                    'room_type'                => 'entire_place',
                    'country_id'               => 1,  // United States
                    'state_id'                 => 3,  // Florida
                    'city_id'                  => 5,  // Miami
                    'address'                  => '1420 Ocean Drive, South Beach',
                    'city'                     => 'Miami',
                    'state'                    => 'Florida',
                    'country'                  => 'United States',
                    'postal_code'              => '33139',
                    'latitude'                 => 25.7825,
                    'longitude'                => -80.1300,
                    'price_per_night'          => 275.00,
                    'weekend_price'            => 340.00,
                    'cleaning_fee'             => 75.00,
                    'extra_guest_fee'          => 25.00,
                    'extra_guest_threshold'    => 2,
                    'pet_fee'                  => 40.00,
                    'security_deposit'         => 150.00,
                    'weekly_discount_percent'  => 8.0,
                    'monthly_discount_percent' => 15.0,
                    'tax_percent'              => 7.0,
                    'currency'                 => 'USD',
                    'min_nights'               => 2,
                    'max_nights'               => 30,
                    'max_guests'               => 4,
                    'bedrooms'                 => 2,
                    'beds'                     => 2,
                    'bathrooms'                => 2,
                    'status'                   => 'published',
                    'instant_bookable'         => true,
                    'cancellation_policy'      => 'flexible',
                    'created_at'               => $now,
                    'updated_at'               => $now,
                ],
                'images' => [
                    'https://images.unsplash.com/photo-1534430480872-3498386e7856?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1560184897-ae75f418493e?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80',
                ],
                'amenities' => [1, 2, 3, 4, 5, 6, 10, 12],
            ],

            // 8 — Positano Cliffside Villa
            [
                'property' => [
                    'host_id'                  => $emmaId,
                    'title'                    => 'Amalfi Coast Cliffside Villa with Panoramic Sea Views',
                    'description'              => 'Perched high on the iconic cliffs of Positano, this villa features terraced lemon gardens, bougainvillea arbors, and uninterrupted vistas of the Mediterranean. Includes private boat charter coordination, daily fresh espresso, and sunset terrace.',
                    'property_type'            => 'villa',
                    'room_type'                => 'entire_place',
                    'country_id'               => 2,  // Italy
                    'state_id'                 => 5,  // Campania
                    'city_id'                  => 7,  // Positano
                    'address'                  => 'Via Positanesi d\'America 22',
                    'city'                     => 'Positano',
                    'state'                    => 'Campania',
                    'country'                  => 'Italy',
                    'postal_code'              => '84017',
                    'latitude'                 => 40.6281,
                    'longitude'                => 14.4847,
                    'price_per_night'          => 480.00,
                    'weekend_price'            => 580.00,
                    'cleaning_fee'             => 130.00,
                    'extra_guest_fee'          => 35.00,
                    'extra_guest_threshold'    => 4,
                    'pet_fee'                  => 0.00,
                    'security_deposit'         => 350.00,
                    'weekly_discount_percent'  => 10.0,
                    'monthly_discount_percent' => 18.0,
                    'tax_percent'              => 22.0,
                    'currency'                 => 'EUR',
                    'min_nights'               => 3,
                    'max_nights'               => 21,
                    'max_guests'               => 6,
                    'bedrooms'                 => 3,
                    'beds'                     => 4,
                    'bathrooms'                => 2,
                    'status'                   => 'published',
                    'instant_bookable'         => false,
                    'cancellation_policy'      => 'moderate',
                    'created_at'               => $now,
                    'updated_at'               => $now,
                ],
                'images' => [
                    'https://images.unsplash.com/photo-1612178537253-bccd437b730e?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1534430480872-3498386e7856?auto=format&fit=crop&w=1200&q=80',
                    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
                ],
                'amenities' => [1, 2, 3, 4, 5, 6, 10],
            ],
        ];

        // ----------------------------------------------------------------
        // Insert properties & associations
        // ----------------------------------------------------------------
        foreach ($properties as $data) {
            $propData = $data['property'];

            // Generate slug
            $propData['slug'] = Property::generateUniqueSlug($propData['title']);

            // Skip if duplicate title already exists
            $existingId = DB::table('properties')->where('title', $propData['title'])->value('id');
            if ($existingId) {
                $this->command->info("Skipping already seeded: {$propData['title']}");
                continue;
            }

            $propertyId = DB::table('properties')->insertGetId($propData);
            $this->command->info("Created property [{$propertyId}]: {$propData['title']}");

            // Insert images
            foreach ($data['images'] as $index => $url) {
                DB::table('property_images')->insert([
                    'property_id' => $propertyId,
                    'image_path'  => $url,
                    'is_primary'  => $index === 0,
                    'sort_order'  => $index,
                    'created_at'  => $now,
                    'updated_at'  => $now,
                ]);
            }

            // Insert amenities
            if (!empty($data['amenities'])) {
                foreach ($data['amenities'] as $amenityId) {
                    if (DB::table('amenities')->where('id', $amenityId)->exists()) {
                        DB::table('amenity_property')->insert([
                            'property_id' => $propertyId,
                            'amenity_id'  => $amenityId,
                            'created_at'  => $now,
                            'updated_at'  => $now,
                        ]);
                    }
                }
            }
        }

        $this->command->info("\n✅ DummyListingsSeeder complete: 8 curated listings created for Emma Williams (emma_host@stayfinder.com)!");
    }
}
