<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Compact booking row for the visitor's booking history list.
 *
 * Deliberately excludes visitor identities, vehicles and tickets: the list only
 * needs enough to pick a booking to open.
 *
 * @mixin \App\Models\Transaction
 */
class BookingSummaryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'transaction_code' => $this->transaction_code,
            'source' => $this->source->value,
            'source_label' => $this->source->label(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'visit_date' => $this->visit_date?->toDateString(),
            'visitor_count' => $this->visitor_count,
            'total_amount' => $this->total_amount,
            'payment_status' => $this->whenLoaded('payment', fn () => $this->payment?->status->value),
            'payment_status_label' => $this->whenLoaded('payment', fn () => $this->payment?->status->label()),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
