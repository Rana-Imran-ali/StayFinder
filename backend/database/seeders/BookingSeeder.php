<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\BookingTransaction;
use App\Models\Property;
use App\Models\PropertyAvailability;
use App\Models\User;
use App\Services\PricingCalculatorService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class BookingSeeder extends Seeder
{
    public function run(): void
    {
        $guest = User::where('email', 'ranaimranali2210@gmail.com')->first()
            ?: User::whereDoesntHave('properties')->first()
            ?: User::first();

        $properties = Property::where('status', 'published')->get();

        if ($properties->isEmpty() || ! $guest) {
            $this->command->warn('Properties or guest missing. Skipping BookingSeeder.');
            return;
        }

        $pricer = new PricingCalculatorService();

        // 1. Seed an Upcoming Confirmed Booking (5 days from now for 3 nights)
        $prop1    = $properties->first();
        $start1   = now()->addDays(5)->startOfDay();
        $end1     = now()->addDays(8)->startOfDay();
        $nights1  = 3;

        try {
            $calc1 = $pricer->calculate($prop1, $start1->toDateString(), $end1->toDateString(), 2);
            $booking1 = Booking::updateOrCreate(
                ['booking_code' => 'SF-DEMO001'],
                [
                    'property_id'      => $prop1->id,
                    'guest_id'         => $guest->id,
                    'host_id'          => $prop1->host_id,
                    'check_in'         => $start1->toDateString(),
                    'check_out'        => $end1->toDateString(),
                    'nights'           => $nights1,
                    'guests_count'     => 2,
                    'has_pet'          => false,
                    'base_price'       => $calc1['base_total'],
                    'cleaning_fee'     => $calc1['cleaning_fee'],
                    'extra_guest_fee'  => $calc1['extra_guest_fee'],
                    'pet_fee'          => $calc1['pet_fee'],
                    'discount_amount'  => $calc1['discount_amount'],
                    'discount_label'   => $calc1['discount_label'],
                    'tax_amount'       => $calc1['tax_amount'],
                    'security_deposit' => $calc1['security_deposit'],
                    'total_amount'     => $calc1['total'],
                    'currency'         => $prop1->currency ?? 'USD',
                    'status'           => 'confirmed',
                    'payment_status'   => 'paid',
                    'special_requests' => 'Arriving late evening around 8 PM. Self check-in keypad code requested.',
                ]
            );

            // Block dates on calendar
            $curr = $start1->copy();
            while ($curr->lt($end1)) {
                PropertyAvailability::updateOrCreate(
                    ['property_id' => $prop1->id, 'date' => $curr->toDateString()],
                    ['is_available' => false, 'status' => 'booked', 'note' => 'Booking SF-DEMO001']
                );
                $curr->addDay();
            }

            BookingTransaction::updateOrCreate(
                ['transaction_code' => 'TX-DEMO-CONFIRMED'],
                [
                    'booking_id'      => $booking1->id,
                    'user_id'         => $guest->id,
                    'type'            => 'charge',
                    'amount'          => $booking1->total_amount,
                    'currency'        => $booking1->currency,
                    'payment_method'  => 'card',
                    'payment_gateway' => 'system',
                    'status'          => 'successful',
                ]
            );

            $this->command->info('✓ Seeded upcoming confirmed booking: SF-DEMO001');
        } catch (\Throwable $e) {
            $this->command->warn('Error seeding booking 1: ' . $e->getMessage());
        }

        // 2. Seed a Past Completed Booking (15 days ago for 4 nights)
        if ($properties->count() > 1) {
            $prop2   = $properties->get(1);
            $start2  = now()->subDays(20)->startOfDay();
            $end2    = now()->subDays(16)->startOfDay();
            $nights2 = 4;

            try {
                $calc2 = $pricer->calculate($prop2, $start2->toDateString(), $end2->toDateString(), 1);
                $booking2 = Booking::updateOrCreate(
                    ['booking_code' => 'SF-DEMO002'],
                    [
                        'property_id'      => $prop2->id,
                        'guest_id'         => $guest->id,
                        'host_id'          => $prop2->host_id,
                        'check_in'         => $start2->toDateString(),
                        'check_out'        => $end2->toDateString(),
                        'nights'           => $nights2,
                        'guests_count'     => 1,
                        'has_pet'          => false,
                        'base_price'       => $calc2['base_total'],
                        'cleaning_fee'     => $calc2['cleaning_fee'],
                        'extra_guest_fee'  => $calc2['extra_guest_fee'],
                        'pet_fee'          => $calc2['pet_fee'],
                        'discount_amount'  => $calc2['discount_amount'],
                        'tax_amount'       => $calc2['tax_amount'],
                        'security_deposit' => $calc2['security_deposit'],
                        'total_amount'     => $calc2['total'],
                        'currency'         => $prop2->currency ?? 'USD',
                        'status'           => 'completed',
                        'payment_status'   => 'paid',
                    ]
                );

                BookingTransaction::updateOrCreate(
                    ['transaction_code' => 'TX-DEMO-PAST'],
                    [
                        'booking_id'      => $booking2->id,
                        'user_id'         => $guest->id,
                        'type'            => 'charge',
                        'amount'          => $booking2->total_amount,
                        'currency'        => $booking2->currency,
                        'payment_method'  => 'card',
                        'payment_gateway' => 'system',
                        'status'          => 'successful',
                    ]
                );

                $this->command->info('✓ Seeded past completed booking: SF-DEMO002');
            } catch (\Throwable $e) {
                $this->command->warn('Error seeding booking 2: ' . $e->getMessage());
            }
        }
    }
}
