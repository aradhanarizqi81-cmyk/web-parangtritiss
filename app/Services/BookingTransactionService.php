<?php

namespace App\Services;

use App\Enums\PaymentMethod;
use App\Enums\PaymentSimulationOutcome;
use App\Enums\PaymentStatus;
use App\Enums\TicketStatus;
use App\Enums\TransactionSource;
use App\Enums\TransactionStatus;
use App\Models\AuditLog;
use App\Models\Payment;
use App\Models\Ticket;
use App\Models\Transaction;
use App\Models\TransactionVehicle;
use App\Models\User;
use App\Models\Visitor;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Online booking workflow.
 *
 * Deliberately different from the counter flow: an online booking is paid by
 * the visitor through a clearly-labelled academic simulation, and individual
 * tickets are only issued once that simulation succeeds. Everything is written
 * inside a database transaction so a failure never leaves partial rows behind.
 */
class BookingTransactionService
{
    public function __construct(private readonly PricingService $pricing) {}

    /**
     * Create an online booking: transaction, visitors, vehicle lines and one
     * pending simulated payment. No tickets are issued yet.
     *
     * @param  array<string, mixed>  $data  validated payload
     */
    public function create(User $visitor, array $data): Transaction
    {
        return DB::transaction(function () use ($visitor, $data): Transaction {
            $visitors = $data['visitors'];
            $vehicleLines = $data['vehicles'] ?? [];

            // Recomputed from the database, never taken from the request.
            $quote = $this->pricing->quote(count($visitors), $vehicleLines);

            $transaction = Transaction::create([
                // Ownership comes from the authenticated session, never from
                // any `user_id` the client may have sent.
                'user_id' => $visitor->id,
                'cashier_user_id' => null,
                'source' => TransactionSource::Online,
                'visit_date' => $data['visit_date'],
                'visitor_count' => count($visitors),
                'visitor_unit_tariff' => $quote['visitor_unit_tariff'],
                'visitor_total' => $quote['visitor_total'],
                'vehicle_total' => $quote['vehicle_total'],
                'total_amount' => $quote['total_amount'],
                'status' => TransactionStatus::Pending,
            ]);

            foreach ($visitors as $visitorRow) {
                Visitor::create([
                    'transaction_id' => $transaction->id,
                    'full_name' => $visitorRow['full_name'],
                    'nik' => $visitorRow['nik'],
                ]);
            }

            foreach ($quote['vehicles'] as $vehicle) {
                TransactionVehicle::create([
                    'transaction_id' => $transaction->id,
                    ...$vehicle,
                ]);
            }

            // Tickets are intentionally NOT created here: an online booking
            // only gets individual tickets once payment succeeds.
            Payment::create([
                'transaction_id' => $transaction->id,
                'method' => PaymentMethod::Simulation,
                'amount' => $quote['total_amount'],
                'status' => PaymentStatus::Pending,
                // Server-issued token the client must present to simulate
                // settlement. Never derived from anything the client sent.
                'reference' => $this->generateSimulationReference(),
            ]);

            AuditLog::record($visitor, 'booking.created', $transaction, [
                'transaction_code' => $transaction->transaction_code,
                'visitor_count' => count($visitors),
                'vehicle_total' => $quote['vehicle_total'],
                'total_amount' => $quote['total_amount'],
            ]);

            return $transaction;
        });
    }

    /**
     * Run the (academic) payment simulation for an online booking.
     *
     * The row is locked for the duration. A successful payment is terminal: any
     * later attempt — success or failure — is answered with a 409 instead of
     * creating a second successful payment or issuing duplicate tickets.
     */
    public function simulatePayment(
        User $user,
        Transaction $transaction,
        string $reference,
        PaymentSimulationOutcome $outcome,
    ): Transaction {
        return DB::transaction(function () use ($user, $transaction, $reference, $outcome): Transaction {
            $locked = Transaction::query()
                ->whereKey($transaction->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->source !== TransactionSource::Online) {
                abort(404);
            }

            $payment = $locked->payment()->lockForUpdate()->first();

            if ($payment === null) {
                abort(422, 'Transaksi ini tidak memiliki catatan pembayaran.');
            }

            // Only a still-pending transaction whose payment has not succeeded
            // may be (re)simulated.
            if (
                $locked->status !== TransactionStatus::Pending
                || $payment->status === PaymentStatus::Success
            ) {
                abort(409, 'Pembayaran transaksi ini sudah selesai.');
            }

            // The reference is issued by the server at booking time; a client
            // that does not hold it cannot settle the transaction.
            if (! hash_equals((string) $payment->reference, $reference)) {
                abort(422, 'Referensi simulasi pembayaran tidak valid.');
            }

            if ($outcome === PaymentSimulationOutcome::Failure) {
                return $this->applyFailure($user, $locked, $payment);
            }

            return $this->applySuccess($user, $locked, $payment);
        });
    }

    /**
     * Record a print (or reprint) of every ticket for a paid online booking.
     *
     * No new ticket or transaction row is created here: reprinting only touches
     * printed_at/status and writes an audit entry.
     *
     * @return Collection<int, Ticket>
     */
    public function printTickets(User $user, Transaction $transaction): Collection
    {
        return DB::transaction(function () use ($user, $transaction): Collection {
            $locked = Transaction::query()
                ->whereKey($transaction->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->source !== TransactionSource::Online) {
                abort(404);
            }

            if (! $locked->isPaid()) {
                abort(422, 'Tiket hanya dapat dicetak setelah pembayaran berhasil.');
            }

            $tickets = $locked->tickets()->lockForUpdate()->get();

            $isReprint = $tickets->contains(
                fn (Ticket $ticket): bool => $ticket->printed_at !== null,
            );

            $printedAt = now();

            foreach ($tickets as $ticket) {
                $ticket->forceFill([
                    'status' => TicketStatus::Printed,
                    // Keep the first print time; later prints are audit-log only.
                    'printed_at' => $ticket->printed_at ?? $printedAt,
                ])->save();
            }

            AuditLog::record(
                $user,
                $isReprint ? 'booking.tickets_reprinted' : 'booking.tickets_printed',
                $locked,
                [
                    'transaction_code' => $locked->transaction_code,
                    'ticket_count' => $tickets->count(),
                ],
            );

            return $tickets;
        });
    }

    private function applyFailure(User $user, Transaction $transaction, Payment $payment): Transaction
    {
        $payment->forceFill([
            'status' => PaymentStatus::Failed,
            'paid_at' => null,
        ])->save();

        // The transaction stays pending: the visitor may retry with the same
        // reference until a simulation succeeds.
        AuditLog::record($user, 'booking.payment_simulated_failed', $transaction, [
            'transaction_code' => $transaction->transaction_code,
            'amount' => $payment->amount,
        ]);

        return $transaction;
    }

    private function applySuccess(User $user, Transaction $transaction, Payment $payment): Transaction
    {
        $payment->forceFill([
            'status' => PaymentStatus::Success,
            'paid_at' => now(),
        ])->save();

        // One ticket per visitor, issued only now that payment has succeeded.
        $visitors = $transaction->visitors()->get();

        foreach ($visitors as $visitor) {
            Ticket::firstOrCreate(
                ['visitor_id' => $visitor->id],
                [
                    'transaction_id' => $transaction->id,
                    'status' => TicketStatus::Issued,
                ],
            );
        }

        // Paid, but explicitly NOT checked in: arrival is recorded at the gate
        // in a later phase, never by a successful payment.
        $transaction->forceFill(['status' => TransactionStatus::Paid])->save();

        AuditLog::record($user, 'booking.payment_simulated_success', $transaction, [
            'transaction_code' => $transaction->transaction_code,
            'amount' => $payment->amount,
            'ticket_count' => $visitors->count(),
        ]);

        return $transaction;
    }

    /**
     * Opaque simulation reference. Carries no personal data.
     */
    private function generateSimulationReference(): string
    {
        return 'SIM-'.Str::upper(Str::random(16));
    }
}
