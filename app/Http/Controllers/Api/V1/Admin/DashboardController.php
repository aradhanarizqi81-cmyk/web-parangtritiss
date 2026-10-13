<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\DashboardFilterRequest;
use App\Models\Transaction;
use App\Services\Reports\DashboardService;
use App\Support\ReportPeriod;
use Illuminate\Http\JsonResponse;

/**
 * Ringkasan dashboard admin.
 *
 * Setiap angka dihitung backend dari database; `role:admin` + ability
 * `viewDashboard` menjaga akses.
 */
class DashboardController extends Controller
{
    public function show(DashboardFilterRequest $request, DashboardService $service): JsonResponse
    {
        $this->authorize('viewDashboard', Transaction::class);

        $period = ReportPeriod::fromInput(
            $request->validated('date_from'),
            $request->validated('date_to'),
        );

        return response()->json([
            'data' => $service->summary($period),
        ]);
    }
}
