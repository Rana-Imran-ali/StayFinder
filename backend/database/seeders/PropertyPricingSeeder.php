<?php

namespace Database\Seeders;

use App\Models\Property;
use App\Models\PropertySeasonalPrice;
use Illuminate\Database\Seeder;

class PropertyPricingSeeder extends Seeder
{
    public function run(): void
    {
        $properties = Property::all();

        if ($properties->isEmpty()) {
            $this->command->warn('No properties found — skipping PropertyPricingSeeder.');
            return;
        }

        $currentYear = (int) now()->year;

        // Season definitions applied to properties
        $seasonTemplates = [
            [
                'name'                     => 'Summer High Season',
                'start_date'               => "{$currentYear}-06-15",
                'end_date'                 => "{$currentYear}-08-31",
                'price_multiplier'         => 1.35,   // +35%
                'weekend_price_multiplier' => 1.50,
                'min_nights'               => 3,
                'is_active'                => true,
            ],
            [
                'name'                     => 'Christmas & New Year Holiday',
                'start_date'               => "{$currentYear}-12-20",
                'end_date'                 => ($currentYear + 1) . "-01-05",
                'price_multiplier'         => 1.60,   // +60%
                'weekend_price_multiplier' => 1.75,
                'min_nights'               => 4,
                'is_active'                => true,
            ],
            [
                'name'                     => 'Autumn Foliage / Shoulder Season',
                'start_date'               => "{$currentYear}-09-15",
                'end_date'                 => "{$currentYear}-10-31",
                'price_multiplier'         => 1.15,   // +15%
                'weekend_price_multiplier' => 1.25,
                'min_nights'               => 2,
                'is_active'                => true,
            ],
        ];

        foreach ($properties as $property) {
            // Update default stay and pricing rules on property if missing
            $property->update([
                'weekend_price'            => $property->weekend_price ?: round($property->price_per_night * 1.20, 2),
                'min_nights'               => $property->min_nights ?: 2,
                'max_nights'               => $property->max_nights ?: 30,
                'extra_guest_fee'          => $property->extra_guest_fee ?: 25.0,
                'extra_guest_threshold'    => $property->extra_guest_threshold ?: 2,
                'pet_fee'                  => $property->pet_fee ?: 35.0,
                'security_deposit'         => $property->security_deposit ?: 150.0,
                'weekly_discount_percent'  => $property->weekly_discount_percent ?: 10.0,
                'monthly_discount_percent' => $property->monthly_discount_percent ?: 20.0,
                'tax_percent'              => $property->tax_percent ?: 8.5,
            ]);

            // Clear existing seasonal rules for clean seeding
            PropertySeasonalPrice::where('property_id', $property->id)->delete();

            $basePrice    = (float) $property->price_per_night;
            $weekendPrice = (float) $property->weekend_price;

            foreach ($seasonTemplates as $tpl) {
                PropertySeasonalPrice::create([
                    'property_id'     => $property->id,
                    'name'            => $tpl['name'],
                    'start_date'      => $tpl['start_date'],
                    'end_date'        => $tpl['end_date'],
                    'price_per_night' => round($basePrice * $tpl['price_multiplier'], 2),
                    'weekend_price'   => round($weekendPrice * $tpl['weekend_price_multiplier'], 2),
                    'min_nights'      => $tpl['min_nights'],
                    'is_active'       => $tpl['is_active'],
                ]);
            }

            $this->command->info("✓ Pricing and seasonal rules seeded for: {$property->title}");
        }
    }
}
