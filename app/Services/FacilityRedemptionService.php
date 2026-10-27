<?php

namespace App\Services;

use App\Enums\FacilityEntitlementStatus;
use App\Enums\TransactionStatus;
use App\Models\AuditLog;
use App\Models\Facility;
use App\Models\Payment;
use App\Models\Ticket;
use App\Models\TicketFacilityEntitlement;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Counter facility claim workflow.
 *
 * A wristband's individual `ticket_code` is the only lookup key. The gate group
 * barcode (`transactions.barcode_token`) and the online redemption code
 * (`transactions.redemption_token`) are deliberately not accepted here.
 *
 * The backend is the source of truth for every condition: the ticket's payment
 * must actually be successful, the transaction must not be cancelled, a real
 * `transaction_checkins` row must exist, the visit date must be today in the
 * venue timezone, and the grant itself must still be available.
 */
class FacilityRedemptionService
{
    /**
     * Relations required to render a lookup/claim result. Visitor `nik` is
     * selected so the resource can mask it; it is never returned raw.
     */
    public const DETAIL_RELATIONS = [
        'visitor:id,full_name,nik',
        'transaction:id,transaction_code,source,status,visit_date,visitor_count',
        'transaction.payment:id,transaction_id,status,paid_at',
        'transaction.checkin:id,transaction_id,checked_in_at,visitor_count_checked_in',
        'facilityEntitlements.facility:id,code,name,active',
        'facilityEntitlements.redeemer:id,name',
    ];

    /**
     * Resolve a ticket from the individual wristband code. Read-only: nothing is
     * written and no claim state is changed by a lookup.
     */
    public function lookup(string $ticketCode): Ticket
    {
        $ticket = Ticket::query()
            ->where('ticket_code', $ticketCode)
            ->first();

        if ($ticket === null) {
            abort(404, 'Kode tiket tidak dikenali.');
        }

        return $ticket->load(self::DETAIL_RELATIONS);
    }

    /**
     * Claim one facility for one individual ticket.
     *
     * The ticket, transaction and entitlement rows are locked for the duration.
     * The final conditional UPDATE only touches a still-granted, unredeemed
     * row, so two simultaneous claims serialize and the loser gets 409.
     */
    public function claim(User $officer, string $ticketCode, string $facilityCode): Ticket
    {
        return DB::transaction(function () use ($officer, $ticketCode, $facilityCode): Ticket {
            $ticket = Ticket::query()
                ->where('ticket_code', $ticketCode)
                ->lockForUpdate()
                ->first();

            if ($ticket === null) {
                abort(404, 'Kode tiket tidak dikenali.');
            }

            $transaction = $ticket->transaction()
                ->lockForUpdate()
                ->first();

            if ($transaction === null) {
                abort(404, 'Transaksi tiket tidak ditemukan.');
            }

            $facility = Facility::query()
                ->where('code', $facilityCode)
                ->first();

            if ($facility === null) {
                abort(404, 'Fasilitas tidak dikenali.');
            }

            $payment = $transaction->payment()
                ->lockForUpdate()
                ->first();

            $entitlement = TicketFacilityEntitlement::query()
                ->where('ticket_id', $ticket->id)
                ->where('facility_id', $facility->id)
                ->lockForUpdate()
                ->first();

            $checkedIn = $transaction->checkin()->exists();
            $today = now(config('visit.timezone'))->toDateString();

            $blockReason = self::claimBlockReason(
                $facility,
                $transaction,
                $entitlement,
                $payment,
                $checkedIn,
                $today,
            );

            if ($blockReason !== null) {
                // A grant that was already redeemed is a conflict, not an
                // invalid request. Everything else is a state that cannot be
                // claimed yet.
                $isAlreadyRedeemed = $entitlement !== null
                    && (
                        $entitlement->status === FacilityEntitlementStatus::Redeemed
                        || $entitlement->redeemed_at !== null
                    );

                abort($isAlreadyRedeemed ? 409 : 422, $blockReason);
            }

            $affected = TicketFacilityEntitlement::query()
                ->whereKey($entitlement->getKey())
                ->where('status', FacilityEntitlementStatus::Granted->value)
                ->whereNull('redeemed_at')
                ->update([
                    'status' => FacilityEntitlementStatus::Redeemed->value,
                    'redeemed_at' => now(),
                    'redeemed_by_user_id' => $officer->id,
                ]);

            if ($affected === 0) {
                abort(409, 'Hak fasilitas ini sudah diklaim.');
            }

            AuditLog::record($officer, 'counter_facility.redeemed', $entitlement, [
                'transaction_code' => $transaction->transaction_code,
                'facility_code' => $facility->code,
                'facility_name' => $facility->name,
            ]);

            return $ticket->load(self::DETAIL_RELATIONS);
        });
    }

    /**
     * Explain why a grant may not be claimed right now.
     *
     * This is shared by the claim service and the read-only resource so the
     * cashier sees the same reason the backend would return. It never writes.
     */
    public static function claimBlockReason(
        ?Facility $facility,
        ?Transaction $transaction,
        ?TicketFacilityEntitlement $entitlement,
        ?Payment $payment,
        bool $checkedIn,
        string $today,
    ): ?string {
        if ($facility === null) {
            return 'Fasilitas tidak dikenali.';
        }

        if (! $facility->active) {
            return 'Fasilitas ini sedang tidak aktif.';
        }

        if ($transaction === null) {
            return 'Transaksi tiket tidak ditemukan.';
        }

        if ($transaction->status === TransactionStatus::Cancelled) {
            return 'Transaksi ini sudah dibatalkan.';
        }

        if ($payment === null || ! $payment->isSuccessful()) {
            return 'Pembayaran transaksi ini belum berhasil.';
        }

        if ($entitlement === null) {
            return 'Tiket ini tidak memiliki hak fasilitas tersebut.';
        }

        if (
            $entitlement->status === FacilityEntitlementStatus::Void
            || $entitlement->voided_at !== null
        ) {
            return 'Hak fasilitas ini sudah dibatalkan.';
        }

        if (
            $entitlement->status === FacilityEntitlementStatus::Redeemed
            || $entitlement->redeemed_at !== null
        ) {
            return 'Hak fasilitas ini sudah diklaim.';
        }

        if ($transaction->visit_date?->toDateString() !== $today) {
            return 'Klaim fasilitas hanya dapat dilakukan pada tanggal kunjungan.';
        }

        if (! $checkedIn) {
            return 'Tiket belum check-in di gerbang.';
        }

        return null;
    }
}
