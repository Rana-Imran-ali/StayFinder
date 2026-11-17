<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HostProfile extends Model
{
    protected $fillable = [
        'user_id',
        'business_name',
        'tax_id',
        'about_host',
        'response_time',
        'languages',
        'is_superhost',
        'cancellation_policy',
        'check_in_time',
        'check_out_time',
        'instant_booking',
    ];

    protected function casts(): array
    {
        return [
            'languages' => 'array',
            'is_superhost' => 'boolean',
            'instant_booking' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
