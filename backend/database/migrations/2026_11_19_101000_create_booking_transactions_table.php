<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('transaction_code', 30)->unique();
            $table->string('type', 20)->default('charge'); // charge, refund, payout
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('USD');
            $table->string('payment_method', 30)->default('card'); // card, wallet, demo
            $table->string('payment_gateway', 30)->default('system');
            $table->string('status', 20)->default('successful'); // pending, successful, failed
            $table->json('raw_response')->nullable();
            $table->timestamps();

            $table->index(['booking_id', 'type'], 'bt_booking_type_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_transactions');
    }
};
