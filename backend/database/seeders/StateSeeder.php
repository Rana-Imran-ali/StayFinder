<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Country;
use App\Models\State;

class StateSeeder extends Seeder
{
    public function run(): void
    {
        $countries = Country::pluck('id', 'code');

        $states = [
            // United States
            ['country_code' => 'US', 'name' => 'California', 'code' => 'CA', 'latitude' => 36.778261, 'longitude' => -119.417932],
            ['country_code' => 'US', 'name' => 'New York', 'code' => 'NY', 'latitude' => 40.712776, 'longitude' => -74.005974],
            ['country_code' => 'US', 'name' => 'Florida', 'code' => 'FL', 'latitude' => 27.664827, 'longitude' => -81.515754],
            ['country_code' => 'US', 'name' => 'Colorado', 'code' => 'CO', 'latitude' => 39.550051, 'longitude' => -105.782067],

            // Italy
            ['country_code' => 'IT', 'name' => 'Campania', 'code' => 'NA', 'latitude' => 40.851775, 'longitude' => 14.268124],
            ['country_code' => 'IT', 'name' => 'Lazio', 'code' => 'RM', 'latitude' => 41.902783, 'longitude' => 12.496366],
            ['country_code' => 'IT', 'name' => 'Tuscany', 'code' => 'FI', 'latitude' => 43.769560, 'longitude' => 11.255814],

            // Switzerland
            ['country_code' => 'CH', 'name' => 'Valais', 'code' => 'VS', 'latitude' => 46.229352, 'longitude' => 7.362049],
            ['country_code' => 'CH', 'name' => 'Bern', 'code' => 'BE', 'latitude' => 46.947974, 'longitude' => 7.447447],
            ['country_code' => 'CH', 'name' => 'Zurich', 'code' => 'ZH', 'latitude' => 47.376887, 'longitude' => 8.541694],

            // Greece
            ['country_code' => 'GR', 'name' => 'South Aegean', 'code' => 'SA', 'latitude' => 36.393156, 'longitude' => 25.461509],
            ['country_code' => 'GR', 'name' => 'Attica', 'code' => 'AT', 'latitude' => 37.983810, 'longitude' => 23.727539],

            // Japan
            ['country_code' => 'JP', 'name' => 'Kyoto Prefecture', 'code' => '26', 'latitude' => 35.011636, 'longitude' => 135.768029],
            ['country_code' => 'JP', 'name' => 'Tokyo', 'code' => '13', 'latitude' => 35.676192, 'longitude' => 139.650311],

            // United Kingdom
            ['country_code' => 'GB', 'name' => 'Greater London', 'code' => 'GL', 'latitude' => 51.507351, 'longitude' => -0.127758],
            ['country_code' => 'GB', 'name' => 'Scotland', 'code' => 'SCT', 'latitude' => 56.490671, 'longitude' => -4.202646],

            // France
            ['country_code' => 'FR', 'name' => 'Île-de-France', 'code' => 'IDF', 'latitude' => 48.856614, 'longitude' => 2.352222],
            ['country_code' => 'FR', 'name' => "Provence-Alpes-Côte d'Azur", 'code' => 'PACA', 'latitude' => 43.935169, 'longitude' => 6.067919],
        ];

        foreach ($states as $s) {
            $countryId = $countries[$s['country_code']] ?? null;
            if ($countryId) {
                State::updateOrCreate(
                    ['country_id' => $countryId, 'name' => $s['name']],
                    [
                        'code' => $s['code'],
                        'latitude' => $s['latitude'],
                        'longitude' => $s['longitude'],
                        'is_active' => true,
                    ]
                );
            }
        }
    }
}
