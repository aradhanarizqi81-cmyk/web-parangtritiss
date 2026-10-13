<?php

namespace App\Http\Controllers\Api\V1\Admin\Report;

use App\Http\Controllers\Api\V1\Admin\Concerns\HandlesReports;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReportFilterRequest;
use App\Http\Resources\Admin\IdentityReportRowResource;
use App\Models\Transaction;
use App\Services\Reports\IdentityReportService;
use App\Support\PaginatedResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * Laporan identitas wisatawan (NIK tersamarkan).
 *
 * Ability `viewIdentityReport` dipisahkan dari laporan lain karena ini
 * satu-satunya laporan yang menyentuh data pribadi.
 */
class IdentityReportController extends Controller
{
    use HandlesReports;

    public function index(ReportFilterRequest $request, IdentityReportService $service): JsonResponse
    {
        $this->authorize('viewIdentityReport', Transaction::class);

        $period = $this->period($request);
        $filters = $this->filters($request);
        $paginator = $service->paginate($period, $filters);

        return response()->json([
            'data' => IdentityReportRowResource::collection($paginator->items()),
            'meta' => PaginatedResponse::meta($paginator),
        ]);
    }

    public function export(ReportFilterRequest $request, IdentityReportService $service): Response
    {
        $this->authorize('viewIdentityReport', Transaction::class);

        $period = $this->period($request);
        $filters = $this->filters($request);

        $this->ensureExportWithinLimit($service->exportCount($period, $filters));

        return $this->csv(
            $this->csvFilename('identitas', $period),
            $service->exportHeader(),
            $service->exportRows($period, $filters),
        );
    }
}
