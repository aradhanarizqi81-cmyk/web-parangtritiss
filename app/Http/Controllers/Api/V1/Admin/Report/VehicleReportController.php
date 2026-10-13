<?php

namespace App\Http\Controllers\Api\V1\Admin\Report;

use App\Http\Controllers\Api\V1\Admin\Concerns\HandlesReports;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReportFilterRequest;
use App\Models\Transaction;
use App\Services\Reports\VehicleReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * Rekap kendaraan berdasarkan jenis.
 */
class VehicleReportController extends Controller
{
    use HandlesReports;

    public function index(ReportFilterRequest $request, VehicleReportService $service): JsonResponse
    {
        $this->authorize('viewReports', Transaction::class);

        $period = $this->period($request);
        $filters = $this->filters($request);

        return response()->json($service->report($period, $filters));
    }

    public function export(ReportFilterRequest $request, VehicleReportService $service): Response
    {
        $this->authorize('viewReports', Transaction::class);

        $period = $this->period($request);
        $filters = $this->filters($request);

        return $this->csv(
            $this->csvFilename('kendaraan', $period),
            $service->exportHeader(),
            $service->exportRows($period, $filters),
        );
    }
}
