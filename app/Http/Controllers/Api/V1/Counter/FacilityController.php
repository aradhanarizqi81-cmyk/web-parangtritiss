<?php

namespace App\Http\Controllers\Api\V1\Counter;

use App\Http\Controllers\Controller;
use App\Http\Requests\Counter\FacilityClaimRequest;
use App\Http\Requests\Counter\FacilityLookupRequest;
use App\Http\Resources\FacilityTicketResource;
use App\Models\Transaction;
use App\Services\FacilityRedemptionService;
use Illuminate\Http\JsonResponse;

/**
 * Counter facility desk (klaim fasilitas per tiket).
 *
 * Every endpoint sits behind `auth:sanctum` + `role:cashier,admin`, the
 * counter-facility rate limiter and TransactionPolicy. The ticket is resolved
 * from the individual wristband code inside the service; the client never sends
 * a ticket id, entitlement id, transaction id or status.
 */
class FacilityController extends Controller
{
    /**
     * Read-only preview: show the ticket, its check-in state and grants.
     */
    public function lookup(
        FacilityLookupRequest $request,
        FacilityRedemptionService $service,
    ): JsonResponse {
        $this->authorize('lookupFacility', Transaction::class);

        $ticket = $service->lookup(
            (string) $request->validated('ticket_code'),
        );

        return response()->json([
            'data' => new FacilityTicketResource($ticket),
        ]);
    }

    /**
     * Claim exactly one facility for one individual ticket.
     */
    public function claim(
        FacilityClaimRequest $request,
        FacilityRedemptionService $service,
    ): JsonResponse {
        $this->authorize('claimFacility', Transaction::class);

        $ticket = $service->claim(
            $request->user(),
            (string) $request->validated('ticket_code'),
            (string) $request->validated('facility_code'),
        );

        return response()->json([
            'message' => 'Klaim fasilitas berhasil dicatat.',
            'data' => new FacilityTicketResource($ticket),
        ]);
    }
}
