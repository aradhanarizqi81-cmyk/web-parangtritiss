<?php

namespace App\Policies;

use App\Enums\Role;
use App\Enums\TransactionSource;
use App\Models\Transaction;
use App\Models\User;

class TransactionPolicy
{
    /**
     * Admins may view any transaction; other users may only view their own.
     *
     * Cashier and gate staff must use their dedicated operational endpoints
     * (added in later phases) rather than reading visitor transactions here.
     */
    public function view(User $user, Transaction $transaction): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $transaction->user_id !== null
            && $transaction->user_id === $user->id;
    }

    /**
     * Only the owner may change an online transaction.
     */
    public function update(User $user, Transaction $transaction): bool
    {
        return $transaction->user_id !== null
            && $transaction->user_id === $user->id;
    }

    /**
     * Only the owner may cancel their own transaction.
     */
    public function delete(User $user, Transaction $transaction): bool
    {
        return $transaction->user_id !== null
            && $transaction->user_id === $user->id;
    }

    /*
    |--------------------------------------------------------------------------
    | Counter (loket) abilities
    |--------------------------------------------------------------------------
    |
    | These are separate from `view`/`update`/`delete` on purpose: a cashier
    | must never read arbitrary online visitor transactions through the owner
    | endpoint. Counter abilities additionally require counter-source data.
    |
    */

    /**
     * Any cashier or admin may open a new counter transaction.
     */
    public function createCounter(User $user): bool
    {
        return $user->hasRole(Role::Cashier, Role::Admin);
    }

    /**
     * Cashiers share the counter, so any cashier may read counter transactions
     * (including ones recorded by another cashier of the same counter).
     * Only counter-source transactions are visible through this ability.
     */
    public function viewCounter(User $user, Transaction $transaction): bool
    {
        if (! $user->hasRole(Role::Cashier, Role::Admin)) {
            return false;
        }

        return $transaction->source === TransactionSource::Counter;
    }

    /**
     * A cashier or admin may attempt to confirm cash on a counter transaction.
     *
     * "May only be confirmed once" is a state rule enforced atomically inside
     * the service (row lock), which answers a repeat attempt with 409 rather
     * than a misleading 403.
     */
    public function confirmCashPayment(User $user, Transaction $transaction): bool
    {
        return $this->viewCounter($user, $transaction);
    }

    /**
     * A cashier or admin may attempt to print counter tickets.
     *
     * "Only once paid" is a state rule enforced by the service, which answers
     * an unpaid print with 422.
     */
    public function printTickets(User $user, Transaction $transaction): bool
    {
        return $this->viewCounter($user, $transaction);
    }
}
