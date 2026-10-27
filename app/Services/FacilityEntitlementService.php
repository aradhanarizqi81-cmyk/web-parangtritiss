<?php

namespace App\Services;

use App\Enums\FacilityEntitlementStatus;
use App\Enums\TicketStatus;
use App\Enums\TransactionStatus;
use App\Models\Facility;
use App\Models\Payment;
use App\Models\Ticket;
use App\Models\TicketFacilityEntitlement;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Facility entitlement lifecycle.
 *
 * Grants are created only after a transaction has actually been paid, one row
 * per individual ticket and per active auto-granted facility. The unique
 * (ticket_id, facility_id) constraint plus `firstOrCreate` make this safe to
 * run more than once (payment retries, backfill, future integrations).
 */
class FacilityEntitlementService
{
    /**
     * Grant auto-granted facilities to every eligible ticket in a transaction.
     *
     * Returns the number of rows that were (or, in dry-run mode, would be)
     * created. A transaction that is unpaid or cancelled is skipped entirely.
     *
     * @param  Collection<int, Facility>|null  $facilities
     */
    public function grantForTransaction(
        Transaction $transaction,
        ?Collection $facilities = null,
        bool $dryRun = false,
    ): int {
        if ($transaction->status === TransactionStatus::Cancelled) {
            return 0;
        }

        if (! $transaction->isPaid()) {
            return 0;
        }

        $payment = $transaction->relationLoaded('payment')
            ? $transaction->payment
            : $transaction->payment()->first();

        if (! $payment instanceof Payment || ! $payment->isSuccessful()) {
            return 0;
        }

        $facilities ??= $this->autoGrantedFacilities();

        if ($facilities->isEmpty()) {
            return 0;
        }

        $tickets = $transaction->relationLoaded('tickets')
            ? $transaction->tickets->reject(
                fn (Ticket $ticket): bool => $ticket->status === TicketStatus::Void,
            )
            : $transaction->tickets()
                ->where('status', '!=', TicketStatus::Void->value)
                ->get();

        if ($tickets->isEmpty()) {
            return 0;
        }

        $grantedAt = now();
        $created = 0;

        foreach ($tickets as $ticket) {
            foreach ($facilities as $facility) {
                if ($dryRun) {
                    $exists = TicketFacilityEntitlement::query()
                        ->where('ticket_id', $ticket->id)
                        ->where('facility_id', $facility->id)
                        ->exists();

                    if (! $exists) {
                        $created++;
                    }

                    continue;
                }

                $entitlement = TicketFacilityEntitlement::firstOrCreate(
                    [
                        'ticket_id' => $ticket->id,
                        'facility_id' => $facility->id,
                    ],
                    [
                        'status' => FacilityEntitlementStatus::Granted,
                        'granted_at' => $grantedAt,
                    ],
                );

                if ($entitlement->wasRecentlyCreated) {
                    $created++;
                }
            }
        }

        return $created;
    }

    /**
     * @return Collection<int, Facility>
     */
    public function autoGrantedFacilities(?string $code = null): Collection
    {
        return Facility::query()
            ->where('active', true)
            ->where('is_auto_granted', true)
            ->when(
                $code !== null && $code !== '',
                fn ($query) => $query->where('code', $code),
            )
            ->orderBy('id')
            ->get();
    }

    /**
     * Void every still-unredeemed grant for a cancelled transaction.
     *
     * Redemptions already handed to a visitor are intentionally preserved: the
     * facility was consumed, and rewriting them would erase the claim history.
     */
    public function voidForTransaction(Transaction $transaction, ?User $actor = null): int
    {
        $ticketIds = $transaction->tickets()->pluck('id');

        if ($ticketIds->isEmpty()) {
            return 0;
        }

        return TicketFacilityEntitlement::query()
            ->whereIn('ticket_id', $ticketIds)
            ->where('status', FacilityEntitlementStatus::Granted->value)
            ->whereNull('redeemed_at')
            ->update([
                'status' => FacilityEntitlementStatus::Void->value,
                'voided_at' => now(),
                'voided_by_user_id' => $actor?->id,
            ]);
    }
}
