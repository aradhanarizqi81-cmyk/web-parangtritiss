<?php

namespace App\Http\Controllers\Api\V1\Admin\Concerns;

use App\Http\Requests\Admin\ReportFilterRequest;
use App\Support\Csv;
use App\Support\ReportPeriod;
use Illuminate\Http\Response;

/**
 * Bagian bersama seluruh controller laporan: rentang tanggal, filter tervalidasi,
 * pembangun CSV, dan penjaga batas ekspor.
 */
trait HandlesReports
{
    protected function period(ReportFilterRequest $request): ReportPeriod
    {
        return ReportPeriod::fromInput(
            $request->validated('date_from'),
            $request->validated('date_to'),
        );
    }

    /**
     * @return array<string, mixed>
     */
    protected function filters(ReportFilterRequest $request): array
    {
        return $request->validated();
    }

    protected function ensureExportWithinLimit(int $count): void
    {
        if ($count > (int) config('report.max_export_rows')) {
            abort(422, 'Jumlah baris yang diekspor melebihi batas maksimum '.config('report.max_export_rows').'.');
        }
    }

    /**
     * @param  array<int, string>  $header
     * @param  iterable<int, array<int, mixed>>  $rows
     */
    protected function csv(string $filename, array $header, iterable $rows): Response
    {
        return response(Csv::build($header, $rows), 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    protected function csvFilename(string $slug, ReportPeriod $period): string
    {
        return sprintf('laporan-%s-%s_%s.csv', $slug, $period->fromDate(), $period->toDate());
    }
}
