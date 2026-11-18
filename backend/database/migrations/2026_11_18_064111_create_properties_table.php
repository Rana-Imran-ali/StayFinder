<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('properties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('host_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description');
            $table->enum('property_type', ['apartment', 'house', 'villa', 'cabin', 'cottage', 'loft', 'hotel']);
            $table->enum('room_type', ['entire_place', 'private_room', 'shared_room'])->default('entire_place');
            
            // Pricing
            $table->decimal('price_per_night', 10, 2);
            $table->decimal('cleaning_fee', 8, 2)->default(0.00);
            $table->string('currency', 10)->default('USD');
            
            // Location
            $table->string('address');
            $table->string('city', 100);
            $table->string('state', 100)->nullable();
            $table->string('country', 100);
            $table->string('postal_code', 20)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            
            // Capacity
            $table->unsignedSmallInteger('max_guests')->default(1);
            $table->unsignedSmallInteger('bedrooms')->default(1);
            $table->unsignedSmallInteger('beds')->default(1);
            $table->unsignedSmallInteger('bathrooms')->default(1);
            
            // Listing Status
            $table->enum('status', ['draft', 'published', 'unlisted', 'archived'])->default('draft');
            $table->boolean('instant_bookable')->default(true);
            $table->string('cancellation_policy', 50)->default('flexible');
            
            $table->timestamps();
            
            // Indexes for fast search
            $table->index(['city', 'country', 'status']);
            $table->index('price_per_night');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('properties');
    }
};