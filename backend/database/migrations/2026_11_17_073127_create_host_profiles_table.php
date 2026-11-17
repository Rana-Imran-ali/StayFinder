<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('host_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('business_name')->nullable();
            $table->string('tax_id')->nullable();
            $table->text('about_host')->nullable();
            $table->string('response_time', 50)->default('within a few hours');
            $table->json('languages')->nullable();
            $table->boolean('is_superhost')->default(false);
            $table->string('cancellation_policy', 50)->default('flexible');
            $table->string('check_in_time', 20)->default('15:00');
            $table->string('check_out_time', 20)->default('11:00');
            $table->boolean('instant_booking')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('host_profiles');
    }
};
