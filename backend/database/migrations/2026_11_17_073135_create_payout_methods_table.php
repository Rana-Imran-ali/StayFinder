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
        Schema::create('payout_methods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('type', ['bank_transfer', 'paypal', 'stripe']);
            $table->string('account_holder_name');
            $table->string('bank_name')->nullable();
            $table->string('account_number_last_four', 10)->nullable();
            $table->string('routing_number', 50)->nullable();
            $table->string('paypal_email')->nullable();
            $table->string('currency', 10)->default('USD');
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payout_methods');
    }
};
