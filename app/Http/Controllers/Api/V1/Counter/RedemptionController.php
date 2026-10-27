<?php

namespace App\Http\Controllers\Api\V1\Counter;

use App\Http\Controllers\Controller;
use App\Http\Requests\Counter\RedemptionRequest;
use App\Http\Resources\RedemptionResource;
use App\Models\Transaction;
use App\Services\RedemptionService;
use Illuminate\Http\JsonResponse;

/**
 * Counter redemption of online bookings (penukaran tiket fisik).
 *
 * Every endpoint sits behind `auth:sanctum` + `role:cashier,admin` and the
 * counter-redemption rate limiter, and is additionally authorized against
 * TransactionPolicy. The booking is resolved from the scanned code inside the
 * service; the client never sends a transaction id. Hiding the page in the UI is
 * not a control.
 */
class RedemptionController extends Controller
{
    /**
     * Read-only preview: look up the booking without changing any state.
     */
    public function lookup(
        RedemptionRequest $request,
        RedemptionService $service,
    ): JsonResponse {
        $this->authorize('lookupRedemption', Transaction::class);

        $transaction = $service->lookup(
            (string) $request->validated('redemption_token'),
        );

        return response()->json([
            'data' => new RedemptionResource($transaction),
        ]);
    }

    /**
     * Confirm the exchange. This is the only action that records a redemption.
     */
    public function confirm(
        RedemptionRequest $request,
        RedemptionService $service,
    ): JsonResponse {
        $this->authorize('confirmRedemption', Transaction::class);

        $transaction = $service->confirm(
            $request->user(),
            (string) $request->validated('redemption_token'),
        );

        return response()->json([
            'message' => 'Penukaran booking berhasil dicatat.',
            'data' => new RedemptionResource($transaction),
        ]);
    }

    /**
     * Record a print (or reprint) of the redeemed wristbands.
     */
    public function printTickets(
        RedemptionRequest $request,
        RedemptionService $service,
    ): JsonResponse {
        $this->authorize('printRedemption', Transaction::class);

        $token = (string) $request->validated('redemption_token');

        $service->printTickets($request->user(), $token);

        return response()->json([
            'message' => 'Pencetakan gelang dicatat.',
            'data' => new RedemptionResource($service->lookup($token)),
        ]);
    }
}
