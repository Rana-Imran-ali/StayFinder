<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class City extends Model
{
    protected $fillable = [
        'country_id',
        'state_id',
        'name',
        'postal_code_pattern',
        'latitude',
        'longitude',
        'is_popular',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'country_id' => 'integer',
            'state_id' => 'integer',
            'latitude' => 'float',
            'longitude' => 'float',
            'is_popular' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function state(): BelongsTo
    {
        return $this->belongsTo(State::class);
    }

    public function properties(): HasMany
    {
        return $this->hasMany(Property::class);
    }
}
