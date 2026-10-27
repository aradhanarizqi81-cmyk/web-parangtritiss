<?php

namespace App\Http\Resources;

use App\Models\Ticket;
use App\Models\TicketFacilityEntitlement;
use App\Services\FacilityRedemptionService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Counter view of one individual ticket and its facility grants.
 *
 * Deliberately limited to what the facility desk needs: the wristband ticket
 * code, its visitor (masked NIK only), the transaction/check-in state, and the
 * facility entitlements. Neither `barcode_token` (gate) nor `redemption_token`
 * (online pickup) is exposed here.
 *
 * @mixin Ticket
 */
class FacilityTicketResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $transaction = $this->transaction;
        $payment = $transaction?->payment;
        $checkin = $transaction?->checkin;
        $checkedIn = $checkin !== null;
        $today = now(config('visit.timezone'))->toDateString();

        $entitlements = $this->relationLoaded('facilityEntitlements')
            ? $this->facilityEntitlements
            : $this->facilityEntitlements()->get();

        return [
            'id' => $this->id,
            'ticket_code' => $this->ticket_code,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),

            'visitor' => $this->visitor ? [
                'id' => $this->visitor->id,
                'full_name' => $this->visitor->full_name,
                // Masked only; the raw NIK never leaves the backend.
                'masked_nik' => $this->visitor->maskedNik(),
            ] : null,

            'transaction' => $transaction ? [
                'id' => $transaction->id,
                'transaction_code' => $transaction->transaction_code,
                'source' => $transaction->source->value,
                'source_label' => $transaction->source->label(),
                'status' => $transaction->status->value,
                'status_label' => $transaction->status->label(),
                'visit_date' => $transaction->visit_date?->toDateString(),
                'visitor_count' => $transaction->visitor_count,
            ] : null,

            'payment' => $payment ? [
                'status' => $payment->status->value,
                'status_label' => $payment->status->label(),
                'paid_at' => $payment->paid_at?->toIso8601String(),
            ] : null,

            'checkin' => [
                'checked_in' => $checkedIn,
                'checked_in_at' => $checkin?->checked_in_at?->toIso8601String(),
                'visitor_count_checked_in' => $checkin?->visitor_count_checked_in,
            ],

            'facilities' => $entitlements
                ->sortBy('id')
                ->map(function (TicketFacilityEntitlement $entitlement) use (
                    $transaction,
                    $payment,
                    $checkedIn,
                    $today,
                ): array {
                    $facility = $entitlement->facility;
                    $blockReason = FacilityRedemptionService::claimBlockReason(
                        $facility,
                        $transaction,
                        $entitlement,
                        $payment,
                        $checkedIn,
                        $today,
                    );

                    return [
                        'entitlement_id' => $entitlement->id,
                        'code' => $facility?->code,
                        'name' => $facility?->name,
                        'status' => $entitlement->status->value,
                        'status_label' => $entitlement->status->label(),
                        'granted_at' => $entitlement->granted_at?->toIso8601String(),
                        'redeemed_at' => $entitlement->redeemed_at?->toIso8601String(),
                        'redeemed_by' => $entitlement->redeemer ? [
                            'id' => $entitlement->redeemer->id,
                            'name' => $entitlement->redeemer->name,
                        ] : null,
                        'voided_at' => $entitlement->voided_at?->toIso8601String(),
                        'can_claim' => $blockReason === null,
                        'block_reason' => $blockReason,
                    ];
                })
                ->values(),

            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
