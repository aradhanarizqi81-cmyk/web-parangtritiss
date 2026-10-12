<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['code', 'name', 'unit_tariff', 'active'])]
class VehicleType extends Model
{
    protected function casts(): array
    {
        return [
            'unit_tariff' => 'integer',
            'active' => 'boolean',
        ];
    }

    public function transactionVehicles(): HasMany
    {
        return $this->hasMany(TransactionVehicle::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('active', true);
    }
}
