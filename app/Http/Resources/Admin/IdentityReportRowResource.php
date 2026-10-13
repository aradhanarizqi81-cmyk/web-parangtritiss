<?php

namespace App\Http\Resources\Admin;

use App\Models\Visitor;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Baris laporan identitas. Hanya NIK tersamarkan yang dibangun; NIK mentah
 * tidak pernah dikembalikan.
 *
 * @mixin Visitor
 */
class IdentityReportRowResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'transaction_code' => $this->transaction?->transaction_code,
            'visit_date' => $this->transaction?->visit_date?->toDateString(),
            'source' => $this->transaction?->source->value,
            'source_label' => $this->transaction?->source->label(),
            'full_name' => $this->full_name,
            'masked_nik' => $this->maskedNik(),
        ];
    }
}
