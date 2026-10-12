<?php

namespace Database\Seeders;

use App\Models\VehicleType;
use Illuminate\Database\Seeder;

class VehicleTypeSeeder extends Seeder
{
    /**
     * Seed the initial vehicle tariffs.
     *
     * These values are the initial project configuration only and are not a
     * claim that the currently applicable official tariff has been verified.
     */
    public function run(): void
    {
        $types = [
            ['code' => 'motorcycle', 'name' => 'Motor', 'unit_tariff' => 2000],
            ['code' => 'car', 'name' => 'Mobil', 'unit_tariff' => 5000],
            ['code' => 'bus_truck', 'name' => 'Bus / Truk', 'unit_tariff' => 10000],
        ];

        foreach ($types as $type) {
            VehicleType::updateOrCreate(
                ['code' => $type['code']],
                [...$type, 'active' => true],
            );
        }
    }
}
