<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class BookingTransaction extends Model
{
    protected $fillable = [
        'booking_id',
        'user_id',
        'transaction_code',
        'type',
        'amount',
        'currency',
        'payment_method',
        'payment_gateway',
        'status',
        'raw_response',
    ];

    protected function casts(): array
    {
        return [
            'amount'       => 'float',
            'raw_response' => 'array',
        ];
    }

    public static function generateTransactionCode(string $prefix = 'TX'): string
    {
        return $prefix . '-' . strtoupper(Str::random(12));
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
