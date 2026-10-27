<?php

namespace App\Http\Resources;

use App\Models\Ticket;
use App\Models\Transaction;
use App\Models\TransactionVehicle;
use App\Models\Visitor;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Online booking detail, as seen by its owner (and, read-only, an admin).
 *
 * Exposes the booking summary, visitor display names with **masked NIK only**,
 * vehicle lines, payment state (including the server-issued simulation
 * reference) and the individual tickets once issued. Never returns a raw NIK or
 * any credential.
 *
 * `barcode_token` is included on purpose: it is the opaque group barcode that
 * the owner (and an admin) prints on the tickets and that the gate scans. It
 * carries no personal data.
 *
 * @mixin Transaction
 */
class BookingResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'transaction_code' => $this->transaction_code,
            // Opaque group barcode printed on the tickets and scanned at the
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
                // Server-issued token required to run the simulation. Owner-only.
                'simulation_reference' => $this->payment->reference,
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

            /*
             * Redemption (counter pickup). The redemption code is only
             * meaningful once payment has succeeded, so it is withheld until
             * then: the frontend can never show a redemption QR before the
             * booking is paid, even if a UI bug tried to.
             */
            'redemption' => [
                'redeemed' => $this->isRedeemed(),
                'redeemed_at' => $this->redeemed_at?->toIso8601String(),
                'status' => $this->isRedeemed() ? 'redeemed' : 'pending',
                'status_label' => $this->isRedeemed() ? 'Sudah Ditukarkan' : 'Belum Ditukarkan',
                'token' => $this->isPaid() ? $this->redemption_token : null,
            ],

            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
