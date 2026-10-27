<?php

namespace App\Services;

use App\Enums\TicketStatus;
use App\Enums\TransactionSource;
use App\Models\AuditLog;
use App\Models\Ticket;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Counter redemption workflow (penukaran tiket fisik dari booking online).
 *
 * The visitor shows a redemption code at the counter. The officer first looks
 * the booking up (read-only), then explicitly confirms the exchange, then
 * prints the wristbands. Only the explicit confirm writes the redemption; a
 * scan or an opened preview never does.
 *
 * The gate check-in token/flow is untouched: this is a separate token and a
 * separate state, and a redemption never records a gate check-in.
 */
class RedemptionService
{
    /**
     * Relations required to render a redemption preview/result. Visitor `nik`
     * is selected so the resource can mask it; it is never returned raw.
     */
    public const DETAIL_RELATIONS = [
        'user:id,name',
        'redeemer:id,name',
        'visitors:id,transaction_id,full_name,nik',
        'transactionVehicles.vehicleType:id,code,name',
        'payment.receivedBy:id,name',
        'tickets:id,transaction_id,visitor_id,ticket_code,status,printed_at',
    ];

    /**
     * Resolve an online booking from its redemption token. Read-only: nothing is
     * written and the redemption state is never changed by a lookup.
     */
    public function lookup(string $token): Transaction
    {
        $transaction = Transaction::query()
            ->where('redemption_token', $token)
            ->first();

        if ($transaction === null || $transaction->source !== TransactionSource::Online) {
            abort(404, 'Kode penukaran tidak dikenali.');
        }

        return $transaction->load(self::DETAIL_RELATIONS);
    }

    /**
     * Confirm the redemption of an online booking.
     *
     * The row is locked, then updated with a conditional UPDATE that only
     * affects a still-unredeemed row. Two simultaneous scans serialize: the
     * loser sees zero affected rows and is answered with 409. No check-in record
     * is created and no ticket is altered here.
     */
    public function confirm(User $officer, string $token): Transaction
    {
        return DB::transaction(function () use ($officer, $token): Transaction {
            $locked = Transaction::query()
                ->where('redemption_token', $token)
                ->lockForUpdate()
                ->first();

            if ($locked === null || $locked->source !== TransactionSource::Online) {
                abort(404, 'Kode penukaran tidak dikenali.');
            }

            $payment = $locked->payment()->lockForUpdate()->first();

            if ($payment === null || ! $payment->isSuccessful()) {
                abort(422, 'Pembayaran booking ini belum berhasil.');
            }

            if (! $locked->isPaid()) {
                abort(422, 'Booking ini belum dapat ditukarkan.');
            }

            if ($locked->isRedeemed()) {
                abort(409, 'Booking ini sudah ditukarkan.');
            }

            // Atomic guard, mirroring the unique constraint used by check-in:
            // only the first writer may set redeemed_at.
            $affected = Transaction::query()
                ->whereKey($locked->getKey())
                ->whereNull('redeemed_at')
                ->update([
                    'redeemed_at' => now(),
                    'redeemed_by_user_id' => $officer->id,
                ]);

            if ($affected === 0) {
                abort(409, 'Booking ini sudah ditukarkan.');
            }

            $locked->refresh();

            AuditLog::record($officer, 'counter_redemption.completed', $locked, [
                'transaction_code' => $locked->transaction_code,
                'visitor_count' => $locked->visitor_count,
            ]);

            return $locked->load(self::DETAIL_RELATIONS);
        });
    }

    /**
     * Record a print (or reprint) of every wristband.
     *
     * Reprinting never creates a new ticket, a new redemption or a new check-in:
     * it only touches printed_at/status and writes an audit entry. The first
     * printed_at is kept, so later prints are audit-log only.
     *
     * @return Collection<int, Ticket>
     */
    public function printTickets(User $officer, string $token): Collection
    {
        return DB::transaction(function () use ($officer, $token): Collection {
            $locked = Transaction::query()
                ->where('redemption_token', $token)
                ->lockForUpdate()
                ->first();

            if ($locked === null || $locked->source !== TransactionSource::Online) {
                abort(404, 'Kode penukaran tidak dikenali.');
            }

            if (! $locked->isPaid()) {
                abort(422, 'Tiket hanya dapat dicetak setelah pembayaran berhasil.');
            }

            if (! $locked->isRedeemed()) {
                abort(422, 'Booking ini belum ditukarkan.');
            }

            $tickets = $locked->tickets()->lockForUpdate()->get();

            if ($tickets->isEmpty()) {
                abort(422, 'Tiket booking ini belum diterbitkan.');
            }

            $isReprint = $tickets->contains(
                fn (Ticket $ticket): bool => $ticket->printed_at !== null,
            );

            $printedAt = now();

            foreach ($tickets as $ticket) {
                $ticket->forceFill([
                    'status' => TicketStatus::Printed,
                    'printed_at' => $ticket->printed_at ?? $printedAt,
                ])->save();
            }

            AuditLog::record(
                $officer,
                $isReprint
                    ? 'counter_redemption.tickets_reprinted'
                    : 'counter_redemption.tickets_printed',
                $locked,
                [
                    'transaction_code' => $locked->transaction_code,
                    'ticket_count' => $tickets->count(),
                ],
            );

            return $tickets;
        });
    }
}
