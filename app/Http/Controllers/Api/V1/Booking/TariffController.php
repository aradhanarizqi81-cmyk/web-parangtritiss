<?php

namespace App\Http\Controllers\Api\V1\Booking;

use App\Http\Controllers\Controller;
use App\Support\TariffCatalog;
use Illuminate\Http\JsonResponse;

class TariffController extends Controller
{
    /**
     * Active tariffs for the booking form.
     *
     * Read-only, so it carries no audit entry. The frontend only uses these
     * values for a live estimate; the server recomputes every total on booking.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => TariffCatalog::active(),
        ]);
    }
}
