<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    protected $fillable = [
        'booking_id',
        'property_id',
        'guest_id',
        'cleanliness_rating',
        'accuracy_rating',
        'checkin_rating',
        'communication_rating',
        'location_rating',
        'value_rating',
        'comment',
        'host_reply',
        'host_replied_at',
    ];

    protected $casts = [
        'host_replied_at' => 'datetime',
        'cleanliness_rating' => 'integer',
        'accuracy_rating' => 'integer',
        'checkin_rating' => 'integer',
        'communication_rating' => 'integer',
        'location_rating' => 'integer',
        'value_rating' => 'integer',
    ];

    protected $appends = ['overall_rating'];

    public function getOverallRatingAttribute(): float
    {
        $sum = $this->cleanliness_rating + $this->accuracy_rating + $this->checkin_rating
            + $this->communication_rating + $this->location_rating + $this->value_rating;
        return round($sum / 6, 2);
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function guest(): BelongsTo
    {
        return $this->belongsTo(User::class, 'guest_id');
    }
}
