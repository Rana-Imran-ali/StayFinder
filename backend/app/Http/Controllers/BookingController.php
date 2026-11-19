<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\BookingTransaction;
use App\Models\Property;
use App\Models\PropertyAvailability;
use App\Services\PricingCalculatorService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BookingController extends Controller
{
    public function __construct(
        private readonly PricingCalculatorService $pricer
    ) {}

    /**
     * GET /api/bookings
     * List bookings for the authenticated guest.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $tab  = $request->input('tab', 'all'); // upcoming, past, cancelled, all

        $query = Booking::with([
            'property.primaryImage',
            'property.cityRelation',
            'property.countryRelation',
            'host.profile',
        ])
        ->where('guest_id', $user->id)
        ->latest();

        if ($tab === 'upcoming') {
            $query->whereIn('status', ['pending', 'confirmed'])
                  ->where('check_in', '>=', now()->toDateString());
        } elseif ($tab === 'past') {
            $query->where(function ($q) {
                $q->where('status', 'completed')
                  ->orWhere(function ($sub) {
                      $sub->where('status', 'confirmed')
                          ->where('check_out', '<', now()->toDateString());
                  });
            });
        } elseif ($tab === 'cancelled') {
            $query->whereIn('status', ['cancelled', 'rejected']);
        }

        $bookings = $query->paginate((int) $request->input('per_page', 10));

        return response()->json([
            'success' => true,
            'data'    => $bookings,
        ]);
    }

    /**
     * GET /api/bookings/{id}
     * Get single booking detail.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user    = $request->user();
        $booking = Booking::with([
            'property.images',
            'property.host.profile',
            'guest.profile',
            'transactions',
            'cancelledByUser',
        ])->findOrFail($id);

        // Authorization check
        $isGuest = $booking->guest_id === $user->id;
        $isHost  = $booking->host_id === $user->id;
        $isAdmin = $user->hasRole('admin');

        if (! $isGuest && ! $isHost && ! $isAdmin) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to view this reservation.',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data'    => $booking,
        ]);
    }

    /**
     * POST /api/bookings
     * Create a new reservation.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'property_id'      => ['required', 'integer', 'exists:properties,id'],
            'check_in'         => ['required', 'date', 'after_or_equal:today'],
            'check_out'        => ['required', 'date', 'after:check_in'],
            'guests_count'     => ['required', 'integer', 'min:1'],
            'has_pet'          => ['boolean'],
            'special_requests' => ['nullable', 'string', 'max:500'],
            'payment_method'   => ['nullable', 'string', 'in:card,wallet,demo'],
        ]);

        $property = Property::findOrFail($data['property_id']);

        if ($property->status !== 'published') {
            return response()->json([
                'success' => false,
                'message' => 'This property is not currently accepting reservations.',
            ], 422);
        }

        // Host cannot book their own property
        if ($property->host_id === $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot book your own listing.',
            ], 422);
        }

        if ($data['guests_count'] > $property->max_guests) {
            return response()->json([
                'success' => false,
                'message' => "This property allows a maximum of {$property->max_guests} guests.",
            ], 422);
        }

        $checkIn  = Carbon::parse($data['check_in'])->startOfDay();
        $checkOut = Carbon::parse($data['check_out'])->startOfDay();

        // 1. Check date collision with existing active bookings
        $hasOverlap = Booking::where('property_id', $property->id)
            ->whereIn('status', ['confirmed', 'pending'])
            ->where(function ($q) use ($checkIn, $checkOut) {
                $q->where('check_in', '<', $checkOut->toDateString())
                  ->where('check_out', '>', $checkIn->toDateString());
            })
            ->exists();

        if ($hasOverlap) {
            return response()->json([
                'success' => false,
                'message' => 'The selected dates are already booked or pending approval.',
            ], 422);
        }

        // 2. Calculate official pricing & verify calendar availability
        try {
            $calc = $this->pricer->calculate(
                $property,
                $checkIn->toDateString(),
                $checkOut->toDateString(),
                (int) $data['guests_count'],
                (bool) ($data['has_pet'] ?? false)
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        if (! $calc['available']) {
            return response()->json([
                'success' => false,
                'message' => 'One or more of the selected dates have been blocked by the host.',
            ], 422);
        }

        // 3. Atomic reservation creation
        $booking = DB::transaction(function () use ($user, $property, $checkIn, $checkOut, $data, $calc) {
            $isInstant = (bool) $property->instant_bookable;
            $status    = $isInstant ? 'confirmed' : 'pending';
            $payStatus = $isInstant ? 'paid' : 'unpaid';

            $newBooking = Booking::create([
                'booking_code'     => Booking::generateBookingCode(),
                'property_id'      => $property->id,
                'guest_id'         => $user->id,
                'host_id'          => $property->host_id,
                'check_in'         => $checkIn->toDateString(),
                'check_out'        => $checkOut->toDateString(),
                'nights'           => $calc['nights'],
                'guests_count'     => $data['guests_count'],
                'has_pet'          => (bool) ($data['has_pet'] ?? false),
                'base_price'       => $calc['base_total'],
                'cleaning_fee'     => $calc['cleaning_fee'],
                'extra_guest_fee'  => $calc['extra_guest_fee'],
                'pet_fee'          => $calc['pet_fee'],
                'discount_amount'  => $calc['discount_amount'],
                'discount_label'   => $calc['discount_label'],
                'tax_amount'       => $calc['tax_amount'],
                'security_deposit' => $calc['security_deposit'],
                'total_amount'     => $calc['total'],
                'currency'         => $calc['currency'] ?? 'USD',
                'status'           => $status,
                'payment_status'   => $payStatus,
                'special_requests' => $data['special_requests'] ?? null,
            ]);

            // If instantly confirmed, block the dates in property_availabilities
            if ($isInstant) {
                $curr = $checkIn->copy();
                while ($curr->lt($checkOut)) {
                    PropertyAvailability::updateOrCreate(
                        ['property_id' => $property->id, 'date' => $curr->toDateString()],
                        [
                            'is_available' => false,
                            'status'       => 'booked',
                            'note'         => "Booking {$newBooking->booking_code}",
                        ]
                    );
                    $curr->addDay();
                }

                // Log payment transaction
                BookingTransaction::create([
                    'booking_id'       => $newBooking->id,
                    'user_id'          => $user->id,
                    'transaction_code' => BookingTransaction::generateTransactionCode('CH'),
                    'type'             => 'charge',
                    'amount'           => $calc['total'],
                    'currency'         => $newBooking->currency,
                    'payment_method'   => $data['payment_method'] ?? 'card',
                    'payment_gateway'  => 'system',
                    'status'           => 'successful',
                    'raw_response'     => [
                        'auth_code' => strtoupper(\Illuminate\Support\Str::random(6)),
                        'message'   => 'Payment authorized and charged.',
                    ],
                ]);
            }

            return $newBooking;
        });

        return response()->json([
            'success' => true,
            'message' => $booking->status === 'confirmed'
                ? 'Reservation confirmed! Pack your bags.'
                : 'Reservation requested! Awaiting host confirmation.',
            'data'    => $booking->load(['property.primaryImage', 'property.cityRelation', 'host.profile']),
        ], 201);
    }

    /**
     * POST /api/bookings/{id}/cancel
     * Cancel an existing reservation.
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $booking = Booking::with('property')->findOrFail($id);

        $isGuest = $booking->guest_id === $user->id;
        $isHost  = $booking->host_id === $user->id;
        $isAdmin = $user->hasRole('admin');

        if (! $isGuest && ! $isHost && ! $isAdmin) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized to cancel this booking.',
            ], 403);
        }

        if (in_array($booking->status, ['cancelled', 'completed', 'rejected'])) {
            return response()->json([
                'success' => false,
                'message' => "This reservation cannot be cancelled because it is already {$booking->status}.",
            ], 422);
        }

        DB::transaction(function () use ($user, $booking, $data) {
            // Unblock calendar dates
            $start = Carbon::parse($booking->check_in);
            $end   = Carbon::parse($booking->check_out);

            $curr = $start->copy();
            while ($curr->lt($end)) {
                $avail = PropertyAvailability::where('property_id', $booking->property_id)
                    ->where('date', $curr->toDateString())
                    ->where('status', 'booked')
                    ->first();

                if ($avail) {
                    $avail->update([
                        'is_available' => true,
                        'status'       => 'available',
                        'note'         => null,
                    ]);
                }
                $curr->addDay();
            }

            // Update booking status
            $booking->update([
                'status'              => 'cancelled',
                'cancelled_by'        => $user->id,
                'cancelled_at'        => now(),
                'cancellation_reason' => $data['reason'],
                'payment_status'      => $booking->payment_status === 'paid' ? 'refunded' : $booking->payment_status,
            ]);

            // Create refund transaction if paid
            if ($booking->payment_status === 'paid') {
                BookingTransaction::create([
                    'booking_id'       => $booking->id,
                    'user_id'          => $booking->guest_id,
                    'transaction_code' => BookingTransaction::generateTransactionCode('RF'),
                    'type'             => 'refund',
                    'amount'           => $booking->total_amount,
                    'currency'         => $booking->currency,
                    'payment_method'   => 'refund_to_original',
                    'payment_gateway'  => 'system',
                    'status'           => 'successful',
                    'raw_response'     => [
                        'reason' => $data['reason'],
                    ],
                ]);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Reservation cancelled successfully.',
            'data'    => $booking->fresh(['property.primaryImage', 'transactions']),
        ]);
    }
}
