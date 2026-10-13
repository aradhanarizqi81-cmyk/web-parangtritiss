<?php

namespace App\Services\Reports;

use App\Models\Visitor;
use App\Support\ReportPeriod;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

/**
 * Laporan identitas wisatawan.
 *
 * Hanya menampilkan NIK tersamarkan (`Visitor::maskedNik()`); NIK mentah tidak
 * pernah dibangun di sini, tidak dikembalikan, dan tidak diekspor. Baris laporan
 * berupa satu wisatawan dengan ringkasan transaksinya.
 */
class IdentityReportService
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function paginate(ReportPeriod $period, array $filters): LengthAwarePaginator
    {
        return $this->query($period, $filters)
            ->orderByDesc('id')
            ->paginate((int) ($filters['per_page'] ?? config('report.per_page')))
            ->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function exportCount(ReportPeriod $period, array $filters): int
    {
        return (int) $this->query($period, $filters)->count();
    }

    /**
     * @return array<int, string>
     */
    public function exportHeader(): array
    {
        return ['Kode Transaksi', 'Tanggal Kunjungan', 'Nama', 'NIK (tersamarkan)'];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return \Generator<int, array<int, mixed>>
     */
    public function exportRows(ReportPeriod $period, array $filters): \Generator
    {
        $items = $this->query($period, $filters)->orderByDesc('id')->get();

        foreach ($items as $visitor) {
            yield [
                $visitor->transaction?->transaction_code,
                $visitor->transaction?->visit_date?->toDateString(),
                $visitor->full_name,
                $visitor->maskedNik(),
            ];
        }
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Builder<Visitor>
     */
    private function query(ReportPeriod $period, array $filters): Builder
    {
        return Visitor::query()
            ->select(['id', 'transaction_id', 'full_name', 'nik'])
            ->with(['transaction:id,transaction_code,visit_date,source,status'])
            ->whereHas('transaction', function (Builder $q) use ($period, $filters): void {
                $q->where('visit_date', '>=', $period->fromDate())
                    ->where('visit_date', '<', $period->endDateExclusive())
                    ->when($filters['source'] ?? null, fn (Builder $inner, $source) => $inner->where('source', $source));
            });
    }
}
