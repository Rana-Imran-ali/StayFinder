<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Country extends Model
{
    protected $fillable = [
        'name',
        'code',
        'phone_code',
        'currency',
        'latitude',
        'longitude',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'is_active' => 'boolean',
        ];
    }

    public function states(): HasMany
    {
        return $this->hasMany(State::class)->orderBy('name');
    }

    public function cities(): HasMany
    {
        return $this->hasMany(City::class)->orderBy('name');
    }

    public function properties(): HasMany
    {
        return $this->hasMany(Property::class);
    }
}
