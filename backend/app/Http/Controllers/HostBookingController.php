<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\BookingTransaction;
use App\Models\PropertyAvailability;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class HostBookingController extends Controller
{
    /**
     * GET /api/host/bookings
     * List all reservations across the authenticated host's properties.
     */
    public function index(Request $request): JsonResponse
    {
        $user   = $request->user();
        $status = $request->input('status', 'all');

        $query = Booking::with([
            'property.primaryImage',
            'guest.profile',
            'transactions',
        ])
        ->where('host_id', $user->id)
        ->latest();

        if ($status !== 'all' && in_array($status, ['pending', 'confirmed', 'cancelled', 'completed', 'rejected'])) {
            $query->where('status', $status);
        }

        $bookings = $query->paginate((int) $request->input('per_page', 15));

        // Quick aggregate statistics for the host dashboard header
        $stats = [
            'total_reservations' => Booking::where('host_id', $user->id)->count(),
            'pending_approval'   => Booking::where('host_id', $user->id)->where('status', 'pending')->count(),
            'confirmed_upcoming' => Booking::where('host_id', $user->id)->where('status', 'confirmed')->where('check_in', '>=', now()->toDateString())->count(),
            'total_earnings'     => (float) Booking::where('host_id', $user->id)->where('status', 'confirmed')->sum('total_amount'),
        ];

        return response()->json([
            'success' => true,
            'stats'   => $stats,
            'data'    => $bookings,
        ]);
    }

    /**
     * POST /api/host/bookings/{id}/accept
     * Host accepts a pending reservation request.
     */
    public function accept(Request $request, int $id): JsonResponse
    {
        $user    = $request->user();
        $booking = Booking::with('property')->where('host_id', $user->id)->findOrFail($id);

        if ($booking->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => "Only pending reservation requests can be accepted. Current status is '{$booking->status}'.",
            ], 422);
        }

        DB::transaction(function () use ($booking) {
            // Block dates on calendar
            $start = Carbon::parse($booking->check_in);
            $end   = Carbon::parse($booking->check_out);

            $curr = $start->copy();
            while ($curr->lt($end)) {
                PropertyAvailability::updateOrCreate(
                    ['property_id' => $booking->property_id, 'date' => $curr->toDateString()],
                    [
                        'is_available' => false,
                        'status'       => 'booked',
                        'note'         => "Approved: {$booking->booking_code}",
                    ]
                );
                $curr->addDay();
            }

            // Update booking
            $booking->update([
                'status'         => 'confirmed',
                'payment_status' => 'paid',
            ]);

            // Create transaction record
            BookingTransaction::create([
                'booking_id'       => $booking->id,
                'user_id'          => $booking->guest_id,
                'transaction_code' => BookingTransaction::generateTransactionCode('CH'),
                'type'             => 'charge',
                'amount'           => $booking->total_amount,
                'currency'         => $booking->currency,
                'payment_method'   => 'card',
                'payment_gateway'  => 'system',
                'status'           => 'successful',
                'raw_response'     => [
                    'message' => 'Host approved reservation request.',
                ],
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Reservation confirmed! The guest has been notified and dates have been blocked on your calendar.',
            'data'    => $booking->fresh(['guest.profile', 'property.primaryImage']),
        ]);
    }

    /**
     * POST /api/host/bookings/{id}/reject
     * Host declines a pending reservation request.
     */
    public function reject(Request $request, int $id): JsonResponse
    {
        $user    = $request->user();
        $booking = Booking::where('host_id', $user->id)->findOrFail($id);

        if ($booking->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => "Only pending requests can be declined. Current status is '{$booking->status}'.",
            ], 422);
        }

        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $booking->update([
            'status'              => 'rejected',
            'cancellation_reason' => $data['reason'] ?? 'Host was unable to accept this reservation request.',
            'cancelled_by'        => $user->id,
            'cancelled_at'        => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Reservation request declined.',
            'data'    => $booking->fresh(['guest.profile']),
        ]);
    }
}
