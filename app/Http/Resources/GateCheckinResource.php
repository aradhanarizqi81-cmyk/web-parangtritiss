<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Gate check-in result.
 *
 * Deliberately minimal: it confirms the arrival without ever exposing the
 * barcode token, visitor identities, or NIK. The recorded attendance and the
 * officer who validated are enough for the gate to show a clear result.
 *
 * @mixin \App\Models\TransactionCheckin
 */
class GateCheckinResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $transaction = $this->transaction;

        return [
            'transaction_code' => $transaction?->transaction_code,
            'source' => $transaction?->source->value,
            'source_label' => $transaction?->source->label(),
            'status' => $transaction?->status->value,
            'status_label' => $transaction?->status->label(),
            'visit_date' => $transaction?->visit_date?->toDateString(),
            'visitor_count' => $transaction?->visitor_count,

            'checked_in_at' => $this->checked_in_at?->toIso8601String(),
            'validated_by' => $this->validator ? [
                'id' => $this->validator->id,
                'name' => $this->validator->name,
            ] : null,
        ];
    }
}
