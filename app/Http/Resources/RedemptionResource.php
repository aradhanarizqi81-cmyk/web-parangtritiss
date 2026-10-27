<?php

namespace App\Http\Resources;

use App\Models\Ticket;
use App\Models\Transaction;
use App\Models\TransactionVehicle;
use App\Models\Visitor;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Counter redemption detail for an online booking.
 *
 * This is what a cashier sees after scanning a redemption code. It is
 * deliberately built on its own rather than reusing BookingResource so the
 * simulation reference (a secret owned by the visitor) never reaches the
 * counter, and so the redemption state and print eligibility are explicit.
 *
 * `barcode_token` IS included: it is the opaque group barcode already printed
 * on the physical wristbands and scanned at the gate. It carries no personal
 * data. Visitor NIK is masked only.
 *
 * @mixin Transaction
 */
class RedemptionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $isPaid = $this->isPaid();
        $redeemed = $this->isRedeemed();
        $ticketCount = $this->relationLoaded('tickets')
            ? $this->tickets->count()
            : $this->tickets()->count();

        // A clear reason so the officer knows why a code cannot be redeemed.
        $blockReason = match (true) {
            ! $isPaid => 'Pembayaran booking ini belum berhasil.',
            $ticketCount === 0 => 'Tiket booking ini belum diterbitkan.',
            default => null,
        };

        $canRedeem = $isPaid && $ticketCount > 0 && ! $redeemed;
        $canReprint = $isPaid && $ticketCount > 0 && $redeemed;

        return [
            'id' => $this->id,
            'transaction_code' => $this->transaction_code,
            // Opaque group barcode printed on the wristbands and scanned at the
            // gate. Carries no personal data.
            'barcode_token' => $this->barcode_token,
            'source' => $this->source->value,
            'source_label' => $this->source->label(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'visit_date' => $this->visit_date?->toDateString(),

            'visitor_count' => $this->visitor_count,
            'visitor_unit_tariff' => $this->visitor_unit_tariff,
            'visitor_total' => $this->visitor_total,
            'vehicle_total' => $this->vehicle_total,
            'total_amount' => $this->total_amount,

            'owner' => $this->whenLoaded('user', fn () => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
            ] : null),

            'visitors' => $this->whenLoaded('visitors', fn () => $this->visitors
                ->map(fn (Visitor $visitor): array => [
                    'id' => $visitor->id,
                    'full_name' => $visitor->full_name,
                    // Masked only; the raw NIK never leaves the backend.
                    'masked_nik' => $visitor->maskedNik(),
                ])
                ->values()),

            'vehicles' => $this->whenLoaded('transactionVehicles', fn () => $this->transactionVehicles
                ->map(fn (TransactionVehicle $vehicle): array => [
                    'vehicle_type_id' => $vehicle->vehicle_type_id,
                    'code' => $vehicle->vehicleType?->code,
                    'name' => $vehicle->vehicleType?->name,
                    'quantity' => $vehicle->quantity,
                    'unit_tariff' => $vehicle->unit_tariff,
                    'subtotal' => $vehicle->subtotal,
                ])
                ->values()),

            'payment' => $this->whenLoaded('payment', fn () => $this->payment ? [
                'method' => $this->payment->method->value,
                'method_label' => $this->payment->method->label(),
                'amount' => $this->payment->amount,
                'status' => $this->payment->status->value,
                'status_label' => $this->payment->status->label(),
                'paid_at' => $this->payment->paid_at?->toIso8601String(),
                // The simulation reference is intentionally omitted.
                'received_by' => $this->payment->receivedBy ? [
                    'id' => $this->payment->receivedBy->id,
                    'name' => $this->payment->receivedBy->name,
                ] : null,
            ] : null),

            'tickets' => $this->whenLoaded('tickets', fn () => $this->tickets
                ->map(fn (Ticket $ticket): array => [
                    'id' => $ticket->id,
                    'visitor_id' => $ticket->visitor_id,
                    'ticket_code' => $ticket->ticket_code,
                    'status' => $ticket->status->value,
                    'status_label' => $ticket->status->label(),
                    'printed_at' => $ticket->printed_at?->toIso8601String(),
                ])
                ->values()),

            'redemption' => [
                'redeemed' => $redeemed,
                'redeemed_at' => $this->redeemed_at?->toIso8601String(),
                'redeemed_by' => $this->whenLoaded('redeemer', fn () => $this->redeemer ? [
                    'id' => $this->redeemer->id,
                    'name' => $this->redeemer->name,
                ] : null),
                'status' => $redeemed ? 'redeemed' : 'pending',
                'status_label' => $redeemed ? 'Sudah Ditukarkan' : 'Belum Ditukarkan',
                'can_redeem' => $canRedeem,
                'can_reprint' => $canReprint,
                'block_reason' => $blockReason,
            ],

            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
