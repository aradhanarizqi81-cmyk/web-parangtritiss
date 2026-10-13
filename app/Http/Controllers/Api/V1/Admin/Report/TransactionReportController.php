<?php

namespace App\Http\Controllers\Api\V1\Admin\Report;

use App\Http\Controllers\Api\V1\Admin\Concerns\HandlesReports;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReportFilterRequest;
use App\Http\Resources\Admin\TransactionReportRowResource;
use App\Models\Transaction;
use App\Services\Reports\TransactionReportService;
use App\Support\PaginatedResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * Laporan transaksi dan pendapatan.
 */
class TransactionReportController extends Controller
{
    use HandlesReports;

    public function index(ReportFilterRequest $request, TransactionReportService $service): JsonResponse
    {
        $this->authorize('viewReports', Transaction::class);

        $period = $this->period($request);
        $filters = $this->filters($request);
        $paginator = $service->paginate($period, $filters);

        return response()->json([
            'data' => TransactionReportRowResource::collection($paginator->items()),
            'meta' => PaginatedResponse::meta($paginator),
            'summary' => $service->summary($period, $filters),
        ]);
    }

    public function export(ReportFilterRequest $request, TransactionReportService $service): Response
    {
        $this->authorize('viewReports', Transaction::class);

        $period = $this->period($request);
        $filters = $this->filters($request);

        $this->ensureExportWithinLimit($service->exportCount($period, $filters));

        return $this->csv(
            $this->csvFilename('transaksi', $period),
            $service->exportHeader(),
            $service->exportRows($period, $filters),
        );
    }
}
