<?php

namespace App\Http\Controllers\Api\V1\Gate;

use App\Http\Controllers\Controller;
use App\Http\Requests\Gate\CheckInRequest;
use App\Http\Resources\GateCheckinResource;
use App\Models\Transaction;
use App\Services\GateCheckinService;
use Illuminate\Http\JsonResponse;

/**
 * Gate (gerbang) check-in.
 *
 * The single endpoint sits behind `auth:sanctum` + `role:gate_staff,admin` and
 * is additionally authorized against TransactionPolicy. The barcode token is the
 * only client input: the service resolves and validates the transaction
 * server-side. Hiding the page in the UI is not a control.
 */
class CheckInController extends Controller
{
    public function store(
        CheckInRequest $request,
        GateCheckinService $service,
    ): JsonResponse {
        $this->authorize('checkInGate', Transaction::class);

        $checkin = $service->checkIn(
            $request->user(),
            (string) $request->validated('barcode_token'),
        );

        return response()->json([
            'message' => 'Check-in berhasil dicatat.',
            'data' => new GateCheckinResource(
                $checkin->load(['transaction', 'validator:id,name']),
            ),
        ], 201);
    }
}
