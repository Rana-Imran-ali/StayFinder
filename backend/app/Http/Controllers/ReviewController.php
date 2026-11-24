<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    /**
     * GET /api/properties/{id}/reviews
     * Public: list approved reviews for a property.
     */
    public function index(Request $request, int $propertyId): JsonResponse
    {
        $reviews = Review::with(['guest:id,name,profile_photo_path'])
            ->where('property_id', $propertyId)
            ->latest()
            ->paginate(10);

        return response()->json($reviews);
    }

    /**
     * POST /api/bookings/{id}/review
     * Authenticated guest submits a review for a completed booking.
     */
    public function store(Request $request, int $bookingId): JsonResponse
    {
        $user = $request->user();

        $booking = Booking::where('id', $bookingId)
            ->where('guest_id', $user->id)
            ->where(function ($q) {
                $q->where('status', 'completed')
                  ->orWhere(function ($sub) {
                      $sub->whereIn('status', ['confirmed', 'paid'])
                          ->where('check_out_date', '<=', now()->toDateString());
                  });
            })
            ->firstOrFail();

        // Mark as completed if it was confirmed/paid
        if ($booking->status !== 'completed') {
            $booking->update(['status' => 'completed']);
        }

        // One review per booking
        if (Review::where('booking_id', $booking->id)->exists()) {
            return response()->json(['message' => 'You have already reviewed this booking.'], 422);
        }

        $data = $request->validate([
            'cleanliness_rating'    => 'required|integer|min:1|max:5',
            'accuracy_rating'       => 'required|integer|min:1|max:5',
            'checkin_rating'        => 'required|integer|min:1|max:5',
            'communication_rating'  => 'required|integer|min:1|max:5',
            'location_rating'       => 'required|integer|min:1|max:5',
            'value_rating'          => 'required|integer|min:1|max:5',
            'comment'               => 'nullable|string|max:2000',
        ]);

        $review = Review::create([
            ...$data,
            'booking_id'  => $booking->id,
            'property_id' => $booking->property_id,
            'guest_id'    => $user->id,
        ]);

        return response()->json([
            'message' => 'Review submitted successfully.',
            'review'  => $review->load('guest:id,name,profile_photo_path'),
        ], 201);
    }

    /**
     * POST /api/reviews/{id}/host-reply
     * Host replies to a review on their property.
     */
    public function hostReply(Request $request, int $reviewId): JsonResponse
    {
        $user = $request->user();

        $review = Review::with('property')->findOrFail($reviewId);

        if ($review->property->host_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $data = $request->validate([
            'host_reply' => 'required|string|max:1000',
        ]);

        $review->update([
            'host_reply'      => $data['host_reply'],
            'host_replied_at' => now(),
        ]);

        return response()->json(['message' => 'Reply posted.', 'review' => $review]);
    }
}
