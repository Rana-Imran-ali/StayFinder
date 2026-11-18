<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Country;

class CountrySeeder extends Seeder
{
    public function run(): void
    {
        $countries = [
            [
                'name' => 'United States',
                'code' => 'US',
                'phone_code' => '+1',
                'currency' => 'USD',
                'latitude' => 37.090240,
                'longitude' => -95.712891,
                'is_active' => true,
            ],
            [
                'name' => 'Italy',
                'code' => 'IT',
                'phone_code' => '+39',
                'currency' => 'EUR',
                'latitude' => 41.871940,
                'longitude' => 12.567380,
                'is_active' => true,
            ],
            [
                'name' => 'Switzerland',
                'code' => 'CH',
                'phone_code' => '+41',
                'currency' => 'CHF',
                'latitude' => 46.818188,
                'longitude' => 8.227512,
                'is_active' => true,
            ],
            [
                'name' => 'Greece',
                'code' => 'GR',
                'phone_code' => '+30',
                'currency' => 'EUR',
                'latitude' => 39.074208,
                'longitude' => 21.824312,
                'is_active' => true,
            ],
            [
                'name' => 'Japan',
                'code' => 'JP',
                'phone_code' => '+81',
                'currency' => 'JPY',
                'latitude' => 36.204824,
                'longitude' => 138.252924,
                'is_active' => true,
            ],
            [
                'name' => 'United Kingdom',
                'code' => 'GB',
                'phone_code' => '+44',
                'currency' => 'GBP',
                'latitude' => 55.378051,
                'longitude' => -3.435973,
                'is_active' => true,
            ],
            [
                'name' => 'France',
                'code' => 'FR',
                'phone_code' => '+33',
                'currency' => 'EUR',
                'latitude' => 46.227638,
                'longitude' => 2.213749,
                'is_active' => true,
            ],
            [
                'name' => 'Spain',
                'code' => 'ES',
                'phone_code' => '+34',
                'currency' => 'EUR',
                'latitude' => 40.463667,
                'longitude' => -3.749220,
                'is_active' => true,
            ],
        ];

        foreach ($countries as $c) {
            Country::updateOrCreate(['code' => $c['code']], $c);
        }
    }
}
