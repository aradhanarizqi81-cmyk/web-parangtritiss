<?php

namespace Database\Seeders;

use App\Models\Facility;
use Illuminate\Database\Seeder;

class FacilitySeeder extends Seeder
{
    /**
     * Seed the initial auto-granted facility.
     *
     * The row is keyed by a stable code so re-seeding never duplicates it and
     * never changes an existing facility's identity.
     */
    public function run(): void
    {
        Facility::updateOrCreate(
            ['code' => 'FREE_TEA'],
            ['name' => 'Minuman Gratis', 'is_auto_granted' => true, 'active' => true],
        );
    }
}
