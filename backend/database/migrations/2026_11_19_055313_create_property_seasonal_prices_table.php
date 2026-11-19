<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('property_seasonal_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained('properties')->cascadeOnDelete();
            $table->string('name', 100);
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('price_per_night', 10, 2);
            $table->decimal('weekend_price', 10, 2)->nullable();
            $table->unsignedSmallInteger('min_nights')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // Explicit shorter name to satisfy MySQL 64-char limit
            $table->index(['property_id', 'start_date', 'end_date', 'is_active'], 'prop_seasonal_lookup_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('property_seasonal_prices');
    }
};
