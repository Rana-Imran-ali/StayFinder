<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->string('booking_code', 20)->unique();
            $table->foreignId('property_id')->constrained('properties')->cascadeOnDelete();
            $table->foreignId('guest_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('host_id')->constrained('users')->cascadeOnDelete();

            // Dates & Occupancy
            $table->date('check_in');
            $table->date('check_out');
            $table->unsignedSmallInteger('nights');
            $table->unsignedSmallInteger('guests_count')->default(1);
            $table->boolean('has_pet')->default(false);

            // Itemized Financial Breakdown
            $table->decimal('base_price', 10, 2);
            $table->decimal('cleaning_fee', 10, 2)->default(0.00);
            $table->decimal('extra_guest_fee', 10, 2)->default(0.00);
            $table->decimal('pet_fee', 10, 2)->default(0.00);
            $table->decimal('discount_amount', 10, 2)->default(0.00);
            $table->string('discount_label', 100)->nullable();
            $table->decimal('tax_amount', 10, 2)->default(0.00);
            $table->decimal('security_deposit', 10, 2)->default(0.00);
            $table->decimal('total_amount', 10, 2);
            $table->string('currency', 3)->default('USD');

            // Status & Lifecycle
            $table->string('status', 25)->default('pending'); // pending, confirmed, cancelled, completed, rejected
            $table->string('payment_status', 25)->default('unpaid'); // unpaid, paid, refunded, partially_refunded

            // Notes & Messages
            $table->text('special_requests')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('cancelled_at')->nullable();
            $table->text('host_notes')->nullable();

            $table->timestamps();

            // Custom short index names for MySQL
            $table->index(['property_id', 'check_in', 'check_out'], 'b_prop_dates_idx');
            $table->index(['guest_id', 'status'], 'b_guest_status_idx');
            $table->index(['host_id', 'status'], 'b_host_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
