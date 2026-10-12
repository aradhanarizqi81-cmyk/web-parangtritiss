<?php

namespace App\Http\Controllers\Api\V1\Counter;

use App\Http\Controllers\Controller;
use App\Http\Requests\Counter\StoreCounterTransactionRequest;
use App\Http\Resources\CounterTransactionResource;
use App\Models\Transaction;
use App\Services\CounterTransactionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Counter (loket) sales.
 *
 * Every endpoint here sits behind `auth:sanctum` + `role:cashier,admin`, and
 * additionally authorizes against TransactionPolicy so a cashier can only
 * touch counter-source transactions. Hiding buttons in the UI is not a control.
 */
class TransactionController extends Controller
{
    /**
     * Relations required to render a counter detail. Visitor `nik` is selected
     * so the resource can mask it; it is never returned raw.
     */
    private const DETAIL_RELATIONS = [
        'cashier:id,name',
        'visitors:id,transaction_id,full_name,nik',
        'transactionVehicles.vehicleType:id,code,name',
        'payment.receivedBy:id,name',
        'tickets:id,transaction_id,visitor_id,ticket_code,status,printed_at',
    ];

    public function store(
        StoreCounterTransactionRequest $request,
        CounterTransactionService $service,
    ): JsonResponse {
        $this->authorize('createCounter', Transaction::class);

        $transaction = $service->create($request->user(), $request->validated());

        return response()->json([
            'message' => 'Transaksi loket berhasil dibuat.',
            'data' => new CounterTransactionResource($this->detail($transaction)),
        ], 201);
    }

    public function show(Transaction $transaction): JsonResponse
    {
        $this->authorize('viewCounter', $transaction);

        return response()->json([
            'data' => new CounterTransactionResource($this->detail($transaction)),
        ]);
    }

    public function confirmPayment(
        Request $request,
        Transaction $transaction,
        CounterTransactionService $service,
    ): JsonResponse {
        $this->authorize('confirmCashPayment', $transaction);

        $transaction = $service->confirmPayment($request->user(), $transaction);

        return response()->json([
            'message' => 'Pembayaran tunai berhasil dikonfirmasi.',
            'data' => new CounterTransactionResource($this->detail($transaction)),
        ]);
    }

    public function printTickets(
        Request $request,
        Transaction $transaction,
        CounterTransactionService $service,
    ): JsonResponse {
        $this->authorize('printTickets', $transaction);

        $service->printTickets($request->user(), $transaction);

        return response()->json([
            'message' => 'Pencetakan tiket dicatat.',
            'data' => new CounterTransactionResource($this->detail($transaction->refresh())),
        ]);
    }

    private function detail(Transaction $transaction): Transaction
    {
        return $transaction->load(self::DETAIL_RELATIONS);
    }
}
