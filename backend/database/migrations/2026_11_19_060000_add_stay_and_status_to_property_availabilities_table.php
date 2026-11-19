<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('property_availabilities', function (Blueprint $table) {
            $table->unsignedSmallInteger('min_nights')->nullable()->after('custom_price');
            $table->string('status', 30)->default('available')->after('is_available'); // available, blocked_by_host, reserved
            $table->index(['property_id', 'date', 'is_available']);
        });
    }

    public function down(): void
    {
        Schema::table('property_availabilities', function (Blueprint $table) {
            $table->dropIndex(['property_id', 'date', 'is_available']);
            $table->dropColumn(['min_nights', 'status']);
        });
    }
};
