<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed default roles
        $roles = [
            ['name' => 'Customer', 'slug' => 'customer', 'description' => 'Standard user who can search and book stays.'],
            ['name' => 'Host', 'slug' => 'host', 'description' => 'Property owner who can list accommodations.'],
            ['name' => 'Admin', 'slug' => 'admin', 'description' => 'Administrator with full platform access.'],
        ];

        foreach ($roles as $roleData) {
            Role::firstOrCreate(['slug' => $roleData['slug']], $roleData);
        }
    }
}
