<?php

namespace Database\Seeders;

use App\Models\Amenity;
use Illuminate\Database\Seeder;

class AmenitySeeder extends Seeder
{
    public function run(): void
    {
        $amenities = [
            // Essentials
            ['name' => 'High-Speed WiFi', 'slug' => 'wifi', 'icon' => 'wifi', 'category' => 'essentials'],
            ['name' => 'Air Conditioning', 'slug' => 'ac', 'icon' => 'wind', 'category' => 'essentials'],
            ['name' => 'Heating', 'slug' => 'heating', 'icon' => 'flame', 'category' => 'essentials'],
            ['name' => 'Washer & Dryer', 'slug' => 'washer', 'icon' => 'shirt', 'category' => 'essentials'],
            ['name' => 'Dedicated Workspace', 'slug' => 'workspace', 'icon' => 'laptop', 'category' => 'essentials'],

            // Kitchen
            ['name' => 'Fully Equipped Kitchen', 'slug' => 'kitchen', 'icon' => 'utensils', 'category' => 'kitchen'],
            ['name' => 'Refrigerator', 'slug' => 'refrigerator', 'icon' => 'snowflake', 'category' => 'kitchen'],
            ['name' => 'Microwave & Oven', 'slug' => 'oven', 'icon' => 'microwave', 'category' => 'kitchen'],
            ['name' => 'Coffee Maker', 'slug' => 'coffee', 'icon' => 'coffee', 'category' => 'kitchen'],

            // Features & Outdoor
            ['name' => 'Private Swimming Pool', 'slug' => 'pool', 'icon' => 'waves', 'category' => 'outdoor'],
            ['name' => 'Hot Tub / Jacuzzi', 'slug' => 'hot_tub', 'icon' => 'sparkles', 'category' => 'outdoor'],
            ['name' => 'Free Parking on Premises', 'slug' => 'parking', 'icon' => 'car', 'category' => 'features'],
            ['name' => 'Ocean / Beach View', 'slug' => 'ocean_view', 'icon' => 'sun', 'category' => 'location'],
            ['name' => 'Patio / Balcony', 'slug' => 'patio', 'icon' => 'trees', 'category' => 'outdoor'],
            ['name' => 'BBQ Grill', 'slug' => 'bbq', 'icon' => 'flame', 'category' => 'outdoor'],

            // Safety
            ['name' => 'Smoke Alarm', 'slug' => 'smoke_alarm', 'icon' => 'bell', 'category' => 'safety'],
            ['name' => 'First Aid Kit', 'slug' => 'first_aid', 'icon' => 'heart-pulse', 'category' => 'safety'],
            ['name' => 'Fire Extinguisher', 'slug' => 'fire_extinguisher', 'icon' => 'shield', 'category' => 'safety'],
        ];

        foreach ($amenities as $item) {
            Amenity::firstOrCreate(['slug' => $item['slug']], $item);
        }
    }
}