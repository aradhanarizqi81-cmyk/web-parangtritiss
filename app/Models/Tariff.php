<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['code', 'name', 'unit_tariff', 'active'])]
class Tariff extends Model
{
    /**
     * Code of the tariff row holding the per-visitor fare.
     */
    public const CODE_VISITOR = 'visitor';

    protected function casts(): array
    {
        return [
            'unit_tariff' => 'integer',
            'active' => 'boolean',
        ];
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('active', true);
    }
}
