<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Country;
use App\Models\State;
use App\Models\City;
use App\Models\Property;

class CitySeeder extends Seeder
{
    public function run(): void
    {
        $countries = Country::pluck('id', 'code');
        $states = State::pluck('id', 'name');

        $cities = [
            // United States - California
            ['country_code' => 'US', 'state_name' => 'California', 'name' => 'Los Angeles', 'postal_code_pattern' => '90001-90089', 'latitude' => 34.052234, 'longitude' => -118.243685, 'is_popular' => true],
            ['country_code' => 'US', 'state_name' => 'California', 'name' => 'San Francisco', 'postal_code_pattern' => '94102-94188', 'latitude' => 37.774929, 'longitude' => -122.419416, 'is_popular' => true],
            ['country_code' => 'US', 'state_name' => 'California', 'name' => 'San Diego', 'postal_code_pattern' => '92101-92199', 'latitude' => 32.715738, 'longitude' => -117.161085, 'is_popular' => true],
            // United States - New York
            ['country_code' => 'US', 'state_name' => 'New York', 'name' => 'New York City', 'postal_code_pattern' => '10001-10292', 'latitude' => 40.712776, 'longitude' => -74.005974, 'is_popular' => true],
            // United States - Florida
            ['country_code' => 'US', 'state_name' => 'Florida', 'name' => 'Miami', 'postal_code_pattern' => '33101-33199', 'latitude' => 25.761680, 'longitude' => -80.191790, 'is_popular' => true],
            // United States - Colorado
            ['country_code' => 'US', 'state_name' => 'Colorado', 'name' => 'Aspen', 'postal_code_pattern' => '81611', 'latitude' => 39.191098, 'longitude' => -106.817535, 'is_popular' => true],

            // Italy - Campania
            ['country_code' => 'IT', 'state_name' => 'Campania', 'name' => 'Positano', 'postal_code_pattern' => '84017', 'latitude' => 40.628059, 'longitude' => 14.484980, 'is_popular' => true],
            ['country_code' => 'IT', 'state_name' => 'Campania', 'name' => 'Naples', 'postal_code_pattern' => '80121-80147', 'latitude' => 40.851775, 'longitude' => 14.268124, 'is_popular' => false],
            // Italy - Lazio
            ['country_code' => 'IT', 'state_name' => 'Lazio', 'name' => 'Rome', 'postal_code_pattern' => '00118-00199', 'latitude' => 41.902783, 'longitude' => 12.496366, 'is_popular' => true],
            // Italy - Tuscany
            ['country_code' => 'IT', 'state_name' => 'Tuscany', 'name' => 'Florence', 'postal_code_pattern' => '50121-50145', 'latitude' => 43.769560, 'longitude' => 11.255814, 'is_popular' => true],

            // Switzerland - Valais
            ['country_code' => 'CH', 'state_name' => 'Valais', 'name' => 'Zermatt', 'postal_code_pattern' => '3920', 'latitude' => 45.976566, 'longitude' => 7.749117, 'is_popular' => true],
            // Switzerland - Bern
            ['country_code' => 'CH', 'state_name' => 'Bern', 'name' => 'Interlaken', 'postal_code_pattern' => '3800', 'latitude' => 46.686348, 'longitude' => 7.863205, 'is_popular' => true],
            // Switzerland - Zurich
            ['country_code' => 'CH', 'state_name' => 'Zurich', 'name' => 'Zurich', 'postal_code_pattern' => '8000-8099', 'latitude' => 47.376887, 'longitude' => 8.541694, 'is_popular' => false],

            // Greece - South Aegean
            ['country_code' => 'GR', 'state_name' => 'South Aegean', 'name' => 'Oia', 'postal_code_pattern' => '84702', 'latitude' => 36.461826, 'longitude' => 25.375328, 'is_popular' => true],
            ['country_code' => 'GR', 'state_name' => 'South Aegean', 'name' => 'Mykonos', 'postal_code_pattern' => '84600', 'latitude' => 37.446709, 'longitude' => 25.328884, 'is_popular' => true],
            // Greece - Attica
            ['country_code' => 'GR', 'state_name' => 'Attica', 'name' => 'Athens', 'postal_code_pattern' => '10431-11855', 'latitude' => 37.983810, 'longitude' => 23.727539, 'is_popular' => true],

            // Japan
            ['country_code' => 'JP', 'state_name' => 'Kyoto Prefecture', 'name' => 'Kyoto', 'postal_code_pattern' => '600-8001', 'latitude' => 35.011636, 'longitude' => 135.768029, 'is_popular' => true],
            ['country_code' => 'JP', 'state_name' => 'Tokyo', 'name' => 'Tokyo', 'postal_code_pattern' => '100-0001', 'latitude' => 35.676192, 'longitude' => 139.650311, 'is_popular' => true],

            // United Kingdom
            ['country_code' => 'GB', 'state_name' => 'Greater London', 'name' => 'London', 'postal_code_pattern' => 'EC1A-WC2R', 'latitude' => 51.507351, 'longitude' => -0.127758, 'is_popular' => true],
            ['country_code' => 'GB', 'state_name' => 'Scotland', 'name' => 'Edinburgh', 'postal_code_pattern' => 'EH1-EH17', 'latitude' => 55.953252, 'longitude' => -3.188267, 'is_popular' => true],

            // France
            ['country_code' => 'FR', 'state_name' => 'Île-de-France', 'name' => 'Paris', 'postal_code_pattern' => '75001-75020', 'latitude' => 48.856614, 'longitude' => 2.352222, 'is_popular' => true],
            ['country_code' => 'FR', 'state_name' => "Provence-Alpes-Côte d'Azur", 'name' => 'Nice', 'postal_code_pattern' => '06000-06300', 'latitude' => 43.710173, 'longitude' => 7.261953, 'is_popular' => true],
        ];

        foreach ($cities as $c) {
            $countryId = $countries[$c['country_code']] ?? null;
            $stateId = $states[$c['state_name']] ?? null;

            if ($countryId) {
                City::updateOrCreate(
                    [
                        'country_id' => $countryId,
                        'name' => $c['name'],
                    ],
                    [
                        'state_id' => $stateId,
                        'postal_code_pattern' => $c['postal_code_pattern'],
                        'latitude' => $c['latitude'],
                        'longitude' => $c['longitude'],
                        'is_popular' => $c['is_popular'],
                        'is_active' => true,
                    ]
                );
            }
        }

        // Link existing properties to their corresponding Country, State, and City
        $this->linkExistingProperties();
    }

    private function linkExistingProperties(): void
    {
        $properties = Property::all();
        foreach ($properties as $prop) {
            $country = Country::where('name', 'like', "%{$prop->country}%")->first();
            $state = State::where('name', 'like', "%{$prop->state}%")->first();
            $city = City::where('name', 'like', "%{$prop->city}%")->first();

            $prop->update([
                'country_id' => $country?->id,
                'state_id' => $state?->id,
                'city_id' => $city?->id,
            ]);
        }
    }
}
