<?php

namespace App\Services;

use App\Enums\PaymentMethod;
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

/**
 * Counter (loket) sale workflow.
 *
 * The server is the single source of truth for pricing and state. Every write
 * happens inside a database transaction so a failure can never leave a
 * half-built sale (missing tickets, missing payment, mismatched totals) behind.
 */
class CounterTransactionService
{
    public function __construct(private readonly PricingService $pricing) {}

    /**
     * Create a counter sale: transaction, visitors, individual tickets,
     * vehicle lines, and a pending cash payment.
     *
     * @param  array<string, mixed>  $data  validated payload
     */
    public function create(User $cashier, array $data): Transaction
    {
        return DB::transaction(function () use ($cashier, $data): Transaction {
            $visitors = $data['visitors'];
            $vehicleLines = $data['vehicles'] ?? [];

            $visitorCount = count($visitors);

            // Recomputed from the database, never taken from the request.
            $quote = $this->pricing->quote($visitorCount, $vehicleLines);

            $transaction = Transaction::create([
                'user_id' => null,
                'cashier_user_id' => $cashier->id,
                'source' => TransactionSource::Counter,
                'visit_date' => $data['visit_date'],
                'visitor_count' => $visitorCount,
                'visitor_unit_tariff' => $quote['visitor_unit_tariff'],
                'visitor_total' => $quote['visitor_total'],
                'vehicle_total' => $quote['vehicle_total'],
                'total_amount' => $quote['total_amount'],
                'status' => TransactionStatus::Pending,
            ]);

            foreach ($visitors as $visitor) {
                $created = Visitor::create([
                    'transaction_id' => $transaction->id,
                    'full_name' => $visitor['full_name'],
                    'nik' => $visitor['nik'],
                ]);

                // Exactly one ticket per visitor (unique on visitor_id).
                Ticket::create([
                    'transaction_id' => $transaction->id,
                    'visitor_id' => $created->id,
                    'status' => TicketStatus::Issued,
                ]);
            }

            foreach ($quote['vehicles'] as $vehicle) {
                TransactionVehicle::create([
                    'transaction_id' => $transaction->id,
                    ...$vehicle,
                ]);
            }

            // A freshly created sale is explicitly NOT paid yet.
            Payment::create([
                'transaction_id' => $transaction->id,
                'method' => PaymentMethod::Cash,
                'amount' => $quote['total_amount'],
                'status' => PaymentStatus::Pending,
            ]);

            AuditLog::record($cashier, 'counter_transaction.created', $transaction, [
                'transaction_code' => $transaction->transaction_code,
                'visitor_count' => $visitorCount,
                'vehicle_total' => $quote['vehicle_total'],
                'total_amount' => $quote['total_amount'],
            ]);

            return $transaction;
        });
    }

    /**
     * Confirm that the cash has actually been received.
     *
     * The row is locked for the duration so two concurrent confirmations
     * cannot both succeed; the loser gets a 409.
     */
    public function confirmPayment(User $cashier, Transaction $transaction): Transaction
    {
        return DB::transaction(function () use ($cashier, $transaction): Transaction {
            $locked = Transaction::query()
                ->whereKey($transaction->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->source !== TransactionSource::Counter) {
                abort(404);
            }

            $payment = $locked->payment()->lockForUpdate()->first();

            if (
                $locked->status !== TransactionStatus::Pending
                || $payment === null
                || $payment->status !== PaymentStatus::Pending
            ) {
                abort(409, 'Pembayaran transaksi ini sudah dikonfirmasi.');
            }

            $payment->forceFill([
                'status' => PaymentStatus::Success,
                'received_by_user_id' => $cashier->id,
                'paid_at' => now(),
            ])->save();

            $locked->forceFill(['status' => TransactionStatus::Paid])->save();

            AuditLog::record($cashier, 'counter_transaction.payment_confirmed', $locked, [
                'transaction_code' => $locked->transaction_code,
                'payment_method' => PaymentMethod::Cash->value,
                'amount' => $payment->amount,
            ]);

            return $locked;
        });
    }

    /**
     * Record a print (or reprint) of every ticket for a paid transaction.
     *
     * No new ticket or transaction row is ever created here: reprinting only
     * touches printed_at/status and writes an audit entry.
     *
     * @return Collection<int, Ticket>
     */
    public function printTickets(User $cashier, Transaction $transaction): Collection
    {
        return DB::transaction(function () use ($cashier, $transaction): Collection {
            $locked = Transaction::query()
                ->whereKey($transaction->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->source !== TransactionSource::Counter) {
                abort(404);
            }

            if (! $locked->isPaid()) {
                abort(422, 'Tiket hanya dapat dicetak setelah pembayaran dikonfirmasi.');
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
                $cashier,
                $isReprint
                    ? 'counter_transaction.tickets_reprinted'
                    : 'counter_transaction.tickets_printed',
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
