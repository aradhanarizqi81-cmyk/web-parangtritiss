<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class RoleUserSeeder extends Seeder
{
    /**
     * Seed one account per role for local development.
     *
     * All accounts share the password below. This is a prototype convenience
     * only and must be changed before any real deployment.
     */
    public function run(): void
    {
        $accounts = [
            ['name' => 'Administrator', 'email' => 'admin@parangtritis.test', 'role' => Role::Admin],
            ['name' => 'Petugas Loket', 'email' => 'cashier@parangtritis.test', 'role' => Role::Cashier],
            ['name' => 'Petugas Gerbang', 'email' => 'gate@parangtritis.test', 'role' => Role::GateStaff],
            ['name' => 'Wisatawan Contoh', 'email' => 'visitor@parangtritis.test', 'role' => Role::Visitor],
        ];

        foreach ($accounts as $account) {
            User::updateOrCreate(
                ['email' => $account['email']],
                [
                    'name' => $account['name'],
                    'role' => $account['role'],
                    'password' => 'password',
                ],
            );
        }
    }
}
