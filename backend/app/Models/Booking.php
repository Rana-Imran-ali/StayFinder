<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Booking extends Model
{
    protected $fillable = [
        'booking_code',
        'property_id',
        'guest_id',
        'host_id',
        'check_in',
        'check_out',
        'nights',
        'guests_count',
        'has_pet',
        'base_price',
        'cleaning_fee',
        'extra_guest_fee',
        'pet_fee',
        'discount_amount',
        'discount_label',
        'tax_amount',
        'security_deposit',
        'total_amount',
        'currency',
        'status',
        'payment_status',
        'special_requests',
        'cancellation_reason',
        'cancelled_by',
        'cancelled_at',
        'host_notes',
    ];

    protected function casts(): array
    {
        return [
            'check_in'         => 'date',
            'check_out'        => 'date',
            'cancelled_at'     => 'datetime',
            'nights'           => 'integer',
            'guests_count'     => 'integer',
            'has_pet'          => 'boolean',
            'base_price'       => 'float',
            'cleaning_fee'     => 'float',
            'extra_guest_fee'  => 'float',
            'pet_fee'          => 'float',
            'discount_amount'  => 'float',
            'tax_amount'       => 'float',
            'security_deposit' => 'float',
            'total_amount'     => 'float',
        ];
    }

    public static function generateBookingCode(): string
    {
        do {
            $code = 'SF-' . strtoupper(Str::random(8));
        } while (static::where('booking_code', $code)->exists());

        return $code;
    }

    // ── Relationships ───────────────────────────────────────────
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function guest(): BelongsTo
    {
        return $this->belongsTo(User::class, 'guest_id');
    }

    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_id');
    }

    public function cancelledByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(BookingTransaction::class);
    }

    // ── Scopes ──────────────────────────────────────────────────
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereIn('status', ['pending', 'confirmed']);
    }

    public function scopeUpcoming(Builder $query): Builder
    {
        return $query->whereIn('status', ['pending', 'confirmed'])
            ->where('check_in', '>=', now()->toDateString());
    }

    public function scopePast(Builder $query): Builder
    {
        return $query->where('status', 'completed')
            ->orWhere(function ($q) {
                $q->where('status', 'confirmed')
                  ->where('check_out', '<', now()->toDateString());
            });
    }
}
