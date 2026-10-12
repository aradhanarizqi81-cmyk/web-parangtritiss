<?php

namespace Database\Seeders;

use App\Models\Tariff;
use Illuminate\Database\Seeder;

class TariffSeeder extends Seeder
{
    /**
     * Seed the visitor tariff.
     *
     * These values are the initial project configuration only and are not a
     * claim that the currently applicable official tariff has been verified.
     */
    public function run(): void
    {
        Tariff::updateOrCreate(
            ['code' => 'visitor'],
            ['name' => 'Wisatawan', 'unit_tariff' => 15000, 'active' => true],
        );
    }
}
