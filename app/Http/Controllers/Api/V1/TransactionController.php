<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\TransactionResource;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;

class TransactionController extends Controller
{
    /**
     * Show a single transaction.
     *
     * Authorization is enforced by TransactionPolicy: an admin may view any
     * transaction, a visitor only their own. Role middleware alone is not
     * sufficient to prevent access to another user's data.
     */
    public function show(Transaction $transaction): JsonResponse
    {
        $this->authorize('view', $transaction);

        return response()->json([
            'data' => new TransactionResource($transaction),
        ]);
    }
}
