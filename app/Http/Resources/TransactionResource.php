<?php

namespace App\Http\Resources;

use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Transaction
 */
class TransactionResource extends JsonResource
{
    /**
     * Visitor identities (including NIK) are intentionally excluded from this
     * summary resource.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'transaction_code' => $this->transaction_code,
            'source' => $this->source->value,
            'status' => $this->status->value,
            'visit_date' => $this->visit_date?->toDateString(),
            'visitor_count' => $this->visitor_count,
            'visitor_unit_tariff' => $this->visitor_unit_tariff,
            'visitor_total' => $this->visitor_total,
            'vehicle_total' => $this->vehicle_total,
            'total_amount' => $this->total_amount,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
