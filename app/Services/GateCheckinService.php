<?php

namespace App\Services;

use App\Enums\TicketStatus;
use App\Enums\TransactionStatus;
use App\Models\AuditLog;
use App\Models\Ticket;
use App\Models\Transaction;
use App\Models\TransactionCheckin;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/**
 * Gate (gerbang) check-in workflow.
 *
 * A single scanned group barcode represents one whole transaction/rombongan: a
 * successful scan records the arrival of every visitor in that transaction. The
 * server is the single source of truth — the transaction, its payment state, the
 * visitor count and the validating officer are all derived from the database and
 * the authenticated session, never trusted from the request body.
 */
class GateCheckinService
{
    /**
     * Validate a scanned barcode token and record the arrival.
     *
     * The transaction row is locked for the duration so two simultaneous scans
     * of the same barcode cannot both succeed; the unique constraint on
     * transaction_checkins.transaction_id is the final database-level guard.
     */
    public function checkIn(User $staff, string $token): TransactionCheckin
    {
        return DB::transaction(function () use ($staff, $token): TransactionCheckin {
            // Lock by the unique barcode token. An unknown token is answered
            // with a bare 404 so no transaction detail is disclosed.
            $transaction = Transaction::query()
                ->where('barcode_token', $token)
                ->lockForUpdate()
                ->first();

            if ($transaction === null) {
                abort(404, 'Barcode tidak dikenali.');
            }

            $payment = $transaction->payment()->lockForUpdate()->first();

            if ($payment === null || ! $payment->isSuccessful()) {
                abort(422, 'Pembayaran transaksi ini belum berhasil.');
            }

            // Already checked in: a repeat scan is a conflict, never a new row.
            if ($transaction->status === TransactionStatus::CheckedIn) {
                abort(409, 'Tiket transaksi ini sudah pernah check-in.');
            }

            // Only a still-paid transaction may be checked in.
            if (! $transaction->status->isCheckinEligible()) {
                abort(422, 'Transaksi belum dapat divalidasi.');
            }

            if (! $this->isVisitDateToday($transaction)) {
                abort(422, 'Validasi hanya dapat dilakukan pada tanggal kunjungan.');
            }

            if ($transaction->checkin()->exists()) {
                abort(409, 'Tiket transaksi ini sudah pernah check-in.');
            }

            $visitorCount = $transaction->visitors()->count();

            // The recorded attendance must agree with the transaction data.
            if ($visitorCount === 0 || $visitorCount !== $transaction->visitor_count) {
                abort(422, 'Jumlah pengunjung transaksi tidak konsisten.');
            }

            try {
                $checkin = TransactionCheckin::create([
                    'transaction_id' => $transaction->id,
                    'validated_by' => $staff->id,
                    'checked_in_at' => now(),
                    'visitor_count_checked_in' => $visitorCount,
                ]);
            } catch (QueryException $exception) {
                // Lost a race with a concurrent scan: the unique constraint on
                // transaction_id rejected the second row.
                if ($this->isUniqueViolation($exception)) {
                    abort(409, 'Tiket transaksi ini sudah pernah check-in.');
                }

                throw $exception;
            }

            // Tickets are consumed only after the check-in row is safely stored.
            $transaction->tickets()
                ->where('status', '!=', TicketStatus::Used->value)
                ->lockForUpdate()
                ->get()
                ->each(fn (Ticket $ticket) => $ticket->forceFill([
                    'status' => TicketStatus::Used,
                ])->save());

            // The status flips to checked_in only now that the record exists, so
            // a failed write can never leave a transaction marked as arrived.
            $transaction->forceFill(['status' => TransactionStatus::CheckedIn])->save();

            AuditLog::record($staff, 'gate.checked_in', $transaction, [
                'transaction_code' => $transaction->transaction_code,
                'source' => $transaction->source->value,
                'visitor_count' => $visitorCount,
            ]);

            return $checkin;
        });
    }

    /**
     * A ticket is only valid on its own visit date, evaluated in the venue's
     * timezone (the application itself runs on UTC).
     */
    private function isVisitDateToday(Transaction $transaction): bool
    {
        $today = now(config('visit.timezone'))->toDateString();

        return $transaction->visit_date?->toDateString() === $today;
    }

    private function isUniqueViolation(QueryException $exception): bool
    {
        return in_array((string) $exception->getCode(), ['23000', '23505'], true);
    }
}
