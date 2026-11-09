<?php

namespace App\Services;

use App\Enums\TicketStatus;
use App\Enums\TransactionSource;
use App\Models\AuditLog;
use App\Models\Ticket;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Pencetakan tiket fisik booking online di gerbang.
 *
 * The scanned payload is the visitor's redemption token (`RDM-`). A lookup is
 * read-only: it never consumes the token and never prints anything. Printing is
 * the only action that writes `redeemed_at`, and it does so atomically so the
 * same token can be consumed exactly once. The flow deliberately does not
 * create a gate check-in or touch facility entitlements: printing a physical
 * ticket is not the same event as validating an arrival or handing over a
 * welcome drink.
 */
class GatePrintService
{
    /**
     * Relations required to render the booking detail. Visitor `nik` is selected
     * so the resource can mask it; it is never returned raw.
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
     * Resolve a printable online booking from its redemption token.
     *
     * Read-only: nothing is written and the token stays usable. A code that is
     * already consumed (redeemed), unpaid, or not an online booking is rejected
     * so the officer cannot start a print that is guaranteed to fail.
     */
    public function lookup(string $code): Transaction
    {
        $token = $this->normalize($code);

        $transaction = $this->findByToken($token);

        $this->ensurePrintable($transaction, lockPayment: false);

        return $transaction->load(self::DETAIL_RELATIONS);
    }

    /**
     * Consume the redemption token and print every ticket atomically.
     *
     * The transaction row is locked for the duration, then a conditional UPDATE
     * (`where redeemed_at is null`) is used as the real guard: two simultaneous
     * prints serialize, the loser sees zero affected rows, and the whole
     * transaction (ticket updates included) is rolled back with a 409. No
     * TransactionCheckin is created and no facility entitlement is touched.
     */
    public function printTickets(User $officer, string $code): Transaction
    {
        $token = $this->normalize($code);

        return DB::transaction(function () use ($officer, $token): Transaction {
            $locked = $this->findByToken($token, lock: true);

            $this->ensurePrintable($locked, lockPayment: true);

            $tickets = $locked->tickets()->lockForUpdate()->get();

            if ($tickets->isEmpty()) {
                abort(422, 'Tiket booking ini belum diterbitkan.');
            }

            // Atomic consumption: only the first writer may set redeemed_at.
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

            $locked->refresh();

            AuditLog::record(
                $officer,
                $isReprint ? 'gate.tickets_reprinted' : 'gate.tickets_printed',
                $locked,
                [
                    'transaction_code' => $locked->transaction_code,
                    'ticket_count' => $tickets->count(),
                ],
            );

            return $locked->load(self::DETAIL_RELATIONS);
        });
    }

    /**
     * Normalise a scanned payload. A USB scanner types the payload like a
     * keyboard, so stray whitespace/newlines are removed before lookup.
     */
    private function normalize(string $code): string
    {
        return (string) preg_replace('/\s+/', '', $code);
    }

    private function findByToken(string $token, bool $lock = false): Transaction
    {
        // A ticket wristband code (TKT-) and the 40-character gate barcode are
        // different credentials; neither belongs in the print flow.
        if ($token === '' || str_starts_with(strtoupper($token), 'TKT-')) {
            abort(404, 'Kode penukaran tidak dikenali.');
        }

        if (strlen($token) === 40 && ! str_starts_with(strtoupper($token), 'RDM-')) {
            abort(404, 'Kode penukaran tidak dikenali.');
        }

        $query = Transaction::query()->where('redemption_token', $token);

        if ($lock) {
            $query->lockForUpdate();
        }

        $transaction = $query->first();

        if ($transaction === null || $transaction->source !== TransactionSource::Online) {
            abort(404, 'Kode penukaran tidak dikenali.');
        }

        return $transaction;
    }

    /**
     * Shared business rule for lookup and print: the booking must be an online
     * booking whose payment really succeeded, and its token must be unused.
     */
    private function ensurePrintable(Transaction $transaction, bool $lockPayment): void
    {
        if ($transaction->isRedeemed()) {
            abort(409, 'Booking ini sudah ditukarkan.');
        }

        $payment = $lockPayment
            ? $transaction->payment()->lockForUpdate()->first()
            : $transaction->payment()->first();

        if ($payment === null || ! $payment->isSuccessful()) {
            abort(422, 'Pembayaran booking ini belum berhasil.');
        }

        if (! $transaction->isPaid()) {
            abort(422, 'Tiket hanya dapat dicetak setelah pembayaran berhasil.');
        }
    }
}
