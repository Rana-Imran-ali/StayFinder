<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->cascadeOnDelete();
            $table->foreignId('property_id')->constrained()->cascadeOnDelete();
            $table->foreignId('guest_id')->constrained('users')->cascadeOnDelete();
            $table->tinyInteger('cleanliness_rating')->unsigned()->default(5);
            $table->tinyInteger('accuracy_rating')->unsigned()->default(5);
            $table->tinyInteger('checkin_rating')->unsigned()->default(5);
            $table->tinyInteger('communication_rating')->unsigned()->default(5);
            $table->tinyInteger('location_rating')->unsigned()->default(5);
            $table->tinyInteger('value_rating')->unsigned()->default(5);
            $table->text('comment')->nullable();
            $table->text('host_reply')->nullable();
            $table->timestamp('host_replied_at')->nullable();
            $table->timestamps();
            $table->unique('booking_id'); // one review per booking
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
