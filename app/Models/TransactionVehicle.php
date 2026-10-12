<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['transaction_id', 'vehicle_type_id', 'quantity', 'unit_tariff', 'subtotal'])]
class TransactionVehicle extends Model
{
    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_tariff' => 'integer',
            'subtotal' => 'integer',
        ];
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function vehicleType(): BelongsTo
    {
        return $this->belongsTo(VehicleType::class);
    }
}
