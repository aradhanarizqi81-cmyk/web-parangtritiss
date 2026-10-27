<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['code', 'name', 'is_auto_granted', 'active'])]
class Facility extends Model
{
    protected function casts(): array
    {
        return [
            'is_auto_granted' => 'boolean',
            'active' => 'boolean',
        ];
    }

    public function entitlements(): HasMany
    {
        return $this->hasMany(TicketFacilityEntitlement::class);
    }
}
