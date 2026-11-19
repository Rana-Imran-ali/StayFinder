<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class Property extends Model
{
    protected $fillable = [
        'host_id',
        'title',
        'slug',
        'description',
        'property_type',
        'room_type',
        'price_per_night',
        'weekend_price',
        'cleaning_fee',
        'extra_guest_fee',
        'extra_guest_threshold',
        'pet_fee',
        'security_deposit',
        'weekly_discount_percent',
        'monthly_discount_percent',
        'tax_percent',
        'currency',
        'country_id',
        'state_id',
        'city_id',
        'address',
        'city',
        'state',
        'country',
        'postal_code',
        'latitude',
        'longitude',
        'max_guests',
        'min_nights',
        'max_nights',
        'bedrooms',
        'beds',
        'bathrooms',
        'status',
        'instant_bookable',
        'cancellation_policy',
    ];

    protected function casts(): array
    {
        return [
            'country_id' => 'integer',
            'state_id' => 'integer',
            'city_id' => 'integer',
            'price_per_night' => 'float',
            'weekend_price' => 'float',
            'cleaning_fee' => 'float',
            'extra_guest_fee' => 'float',
            'extra_guest_threshold' => 'integer',
            'pet_fee' => 'float',
            'security_deposit' => 'float',
            'weekly_discount_percent' => 'float',
            'monthly_discount_percent' => 'float',
            'tax_percent' => 'float',
            'latitude' => 'float',
            'longitude' => 'float',
            'max_guests' => 'integer',
            'min_nights' => 'integer',
            'max_nights' => 'integer',
            'bedrooms' => 'integer',
            'beds' => 'integer',
            'bathrooms' => 'integer',
            'instant_bookable' => 'boolean',
        ];
    }

    public static function generateUniqueSlug(string $title): string
    {
        $slug = Str::slug($title);
        $count = static::where('slug', 'LIKE', "{$slug}%")->count();
        return $count ? "{$slug}-" . ($count + 1) : $slug;
    }

    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_id');
    }

    public function countryRelation(): BelongsTo
    {
        return $this->belongsTo(Country::class, 'country_id');
    }

    public function stateRelation(): BelongsTo
    {
        return $this->belongsTo(State::class, 'state_id');
    }

    public function cityRelation(): BelongsTo
    {
        return $this->belongsTo(City::class, 'city_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(PropertyImage::class)->orderBy('sort_order');
    }

    public function primaryImage(): HasOne
    {
        return $this->hasOne(PropertyImage::class)->where('is_primary', true);
    }

    public function amenities(): BelongsToMany
    {
        return $this->belongsToMany(Amenity::class)->withTimestamps();
    }

    public function availabilities(): HasMany
    {
        return $this->hasMany(PropertyAvailability::class);
    }

    public function seasonalPrices(): HasMany
    {
        return $this->hasMany(PropertySeasonalPrice::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }
}
