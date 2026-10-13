<?php

namespace App\Http\Resources\Admin;

use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Baris laporan kunjungan. Jumlah pendaftar dan jumlah hadir dipisah agar tidak
 * pernah tertukar.
 *
 * @mixin Transaction
 */
class VisitReportRowResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'transaction_code' => $this->transaction_code,
            'visit_date' => $this->visit_date?->toDateString(),
            'source' => $this->source->value,
            'source_label' => $this->source->label(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'registered_visitor_count' => $this->visitor_count,
            'checked_in' => $this->checkin !== null,
            'checked_in_at' => $this->checkin?->checked_in_at?->toIso8601String(),
            'checked_in_visitor_count' => $this->checkin?->visitor_count_checked_in,
            'validated_by' => $this->checkin?->validator ? [
                'id' => $this->checkin->validator->id,
                'name' => $this->checkin->validator->name,
            ] : null,
        ];
    }
}
