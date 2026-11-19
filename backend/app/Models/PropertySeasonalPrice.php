<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PropertySeasonalPrice extends Model
{
    protected $fillable = [
        'property_id',
        'name',
        'start_date',
        'end_date',
        'price_per_night',
        'weekend_price',
        'min_nights',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'start_date'      => 'date',
            'end_date'        => 'date',
            'price_per_night' => 'float',
            'weekend_price'   => 'float',
            'min_nights'      => 'integer',
            'is_active'       => 'boolean',
        ];
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }
}
