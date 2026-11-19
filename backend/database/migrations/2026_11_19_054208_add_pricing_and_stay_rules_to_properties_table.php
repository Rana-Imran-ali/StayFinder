<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            // Weekend & Stay Rules
            $table->decimal('weekend_price', 10, 2)->nullable()->after('price_per_night');
            $table->unsignedSmallInteger('min_nights')->default(1)->after('max_guests');
            $table->unsignedSmallInteger('max_nights')->nullable()->after('min_nights');

            // Additional Charges & Fees
            $table->decimal('extra_guest_fee', 8, 2)->default(0.00)->after('cleaning_fee');
            $table->unsignedSmallInteger('extra_guest_threshold')->default(1)->after('extra_guest_fee');
            $table->decimal('pet_fee', 8, 2)->default(0.00)->after('extra_guest_threshold');
            $table->decimal('security_deposit', 8, 2)->default(0.00)->after('pet_fee');

            // Discounts & Taxes
            $table->decimal('weekly_discount_percent', 5, 2)->default(0.00)->after('security_deposit');
            $table->decimal('monthly_discount_percent', 5, 2)->default(0.00)->after('weekly_discount_percent');
            $table->decimal('tax_percent', 5, 2)->default(0.00)->after('monthly_discount_percent');
        });
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->dropColumn([
                'weekend_price',
                'min_nights',
                'max_nights',
                'extra_guest_fee',
                'extra_guest_threshold',
                'pet_fee',
                'security_deposit',
                'weekly_discount_percent',
                'monthly_discount_percent',
                'tax_percent',
            ]);
        });
    }
};
