<?php

namespace App\Policies;

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
}
