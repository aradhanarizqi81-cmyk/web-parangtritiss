<?php

namespace App\Http\Controllers\Api\V1\Admin\Report;

use App\Http\Controllers\Api\V1\Admin\Concerns\HandlesReports;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReportFilterRequest;
use App\Http\Resources\Admin\VisitReportRowResource;
use App\Models\Transaction;
use App\Services\Reports\VisitReportService;
use App\Support\PaginatedResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * Laporan kunjungan (per transaksi, basis tanggal kunjungan).
 */
class VisitReportController extends Controller
{
    use HandlesReports;

    public function index(ReportFilterRequest $request, VisitReportService $service): JsonResponse
    {
        $this->authorize('viewReports', Transaction::class);

        $period = $this->period($request);
        $filters = $this->filters($request);
        $paginator = $service->paginate($period, $filters);

        return response()->json([
            'data' => VisitReportRowResource::collection($paginator->items()),
            'meta' => PaginatedResponse::meta($paginator),
            'summary' => $service->summary($period, $filters),
        ]);
    }

    public function export(ReportFilterRequest $request, VisitReportService $service): Response
    {
        $this->authorize('viewReports', Transaction::class);

        $period = $this->period($request);
        $filters = $this->filters($request);

        $this->ensureExportWithinLimit($service->exportCount($period, $filters));

        return $this->csv(
            $this->csvFilename('kunjungan', $period),
            $service->exportHeader(),
            $service->exportRows($period, $filters),
        );
    }
}
