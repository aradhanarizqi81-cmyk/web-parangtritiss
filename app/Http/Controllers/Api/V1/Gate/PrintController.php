<?php

namespace App\Http\Controllers\Api\V1\Gate;

use App\Http\Controllers\Controller;
use App\Http\Requests\Gate\PrintRequest;
use App\Http\Resources\RedemptionResource;
use App\Models\Transaction;
use App\Services\GatePrintService;
use Illuminate\Http\JsonResponse;

/**
 * Gate printing of physical tickets for paid online bookings.
 *
 * The booking is resolved from the scanned redemption token (`RDM-`) inside the
 * service; the client never sends a transaction id or an amount. Both actions
 * are additionally authorized against TransactionPolicy and sit behind the
 * gate role middleware. Lookup is read-only; store consumes the token once.
 */
class PrintController extends Controller
{
    public function lookup(PrintRequest $request, GatePrintService $service): JsonResponse
    {
        $this->authorize('printGateTickets', Transaction::class);

        $code = (string) ($request->validated('code') ?? $request->validated('redemption_token') ?? '');
        $transaction = $service->lookup($code);

        return response()->json([
            'data' => new RedemptionResource($transaction),
        ]);
    }

    public function store(PrintRequest $request, GatePrintService $service): JsonResponse
    {
        $this->authorize('printGateTickets', Transaction::class);

        $code = (string) ($request->validated('code') ?? $request->validated('redemption_token') ?? '');
        $transaction = $service->printTickets($request->user(), $code);

        return response()->json([
            'message' => 'Tiket fisik berhasil dicetak.',
            'data' => new RedemptionResource($transaction),
        ]);
    }
}
