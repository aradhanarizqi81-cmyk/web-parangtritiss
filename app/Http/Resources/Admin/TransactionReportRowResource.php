<?php

namespace App\Http\Resources\Admin;

use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Baris laporan transaksi. Memuat tanggal transaksi dan tanggal kunjungan
 * secara terpisah, serta status/waktu pembayaran.
 *
 * @mixin Transaction
 */
class TransactionReportRowResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'transaction_code' => $this->transaction_code,
            'transaction_date' => $this->created_at?->toIso8601String(),
            'visit_date' => $this->visit_date?->toDateString(),
            'source' => $this->source->value,
            'source_label' => $this->source->label(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'visitor_count' => $this->visitor_count,
            'vehicle_count' => (int) ($this->vehicle_count ?? 0),
            'total_amount' => $this->total_amount,
            'payment' => $this->payment ? [
                'method' => $this->payment->method->value,
                'method_label' => $this->payment->method->label(),
                'status' => $this->payment->status->value,
                'status_label' => $this->payment->status->label(),
                'paid_at' => $this->payment->paid_at?->toIso8601String(),
            ] : null,
        ];
    }
}
