<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            [
                'name' => 'Guest',
                'slug' => 'guest',
                'description' => 'Can search and book properties',
            ],
            [
                'name' => 'Host',
                'slug' => 'host',
                'description' => 'Can create and manage properties',
            ],
            [
                'name' => 'Admin',
                'slug' => 'admin',
                'description' => 'Can manage the platform',
            ],
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(
                ['slug' => $role['slug']],
                $role
            );
        }
        $this->call([
        RoleSeeder::class,
    ]);
    
    }
}