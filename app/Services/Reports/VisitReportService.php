<?php

namespace App\Services\Reports;

use App\Models\Transaction;
use App\Support\ReportPeriod;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Laporan kunjungan.
 *
 * Setiap baris adalah satu transaksi pada tanggal kunjungan (`visit_date`)
 * dalam rentang. Jumlah pendaftar (`visitor_count`) selalu ditampilkan
 * terpisah dari jumlah pengunjung yang benar-benar hadir (dari catatan
 * check-in), sehingga keduanya tidak pernah disamakan.
 */
class VisitReportService
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function paginate(ReportPeriod $period, array $filters): LengthAwarePaginator
    {
        return $this->query($period, $filters)
            ->orderByDesc('visit_date')
            ->orderByDesc('id')
            ->paginate((int) ($filters['per_page'] ?? config('report.per_page')))
            ->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array{transactions: int, registered_visitors: int, checked_in_visitors: int}
     */
    public function summary(ReportPeriod $period, array $filters): array
    {
        $base = $this->baseQuery($period, $filters);

        $checkedIn = (clone $base)
            ->join('transaction_checkins', 'transaction_checkins.transaction_id', '=', 'transactions.id')
            ->sum('transaction_checkins.visitor_count_checked_in');

        return [
            'transactions' => (int) (clone $base)->count(),
            'registered_visitors' => (int) (clone $base)->sum('transactions.visitor_count'),
            'checked_in_visitors' => (int) $checkedIn,
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function exportCount(ReportPeriod $period, array $filters): int
    {
        return (int) $this->baseQuery($period, $filters)->count();
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<int, string>
     */
    public function exportHeader(): array
    {
        return ['Kode Transaksi', 'Tanggal Kunjungan', 'Sumber', 'Pendaftar', 'Hadir', 'Status', 'Waktu Check-in'];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return \Generator<int, array<int, mixed>>
     */
    public function exportRows(ReportPeriod $period, array $filters): \Generator
    {
        $items = $this->query($period, $filters)
            ->orderByDesc('visit_date')
            ->orderByDesc('id')
            ->get();

        foreach ($items as $transaction) {
            yield [
                $transaction->transaction_code,
                $transaction->visit_date?->toDateString(),
                $transaction->source->value,
                $transaction->visitor_count,
                $transaction->checkin?->visitor_count_checked_in ?? 0,
                $transaction->status->value,
                $transaction->checkin?->checked_in_at?->toIso8601String() ?? '',
            ];
        }
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Builder<Transaction>
     */
    private function query(ReportPeriod $period, array $filters): Builder
    {
        return Transaction::query()
            ->with(['checkin.validator:id,name'])
            ->where('visit_date', '>=', $period->fromDate())
            ->where('visit_date', '<', $period->endDateExclusive())
            ->when($filters['source'] ?? null, fn (Builder $q, $source) => $q->where('source', $source))
            ->when($filters['status'] ?? null, fn (Builder $q, $status) => $q->where('status', $status))
            ->when(($filters['checked_in'] ?? null) !== null, function (Builder $q) use ($filters): void {
                $filters['checked_in'] ? $q->whereHas('checkin') : $q->whereDoesntHave('checkin');
            });
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function baseQuery(ReportPeriod $period, array $filters): \Illuminate\Database\Query\Builder
    {
        return DB::table('transactions')
            ->where('visit_date', '>=', $period->fromDate())
            ->where('visit_date', '<', $period->endDateExclusive())
            ->when($filters['source'] ?? null, fn ($q, $source) => $q->where('source', $source))
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when(($filters['checked_in'] ?? null) !== null, function ($q) use ($filters): void {
                $filters['checked_in']
                    ? $q->whereExists(fn ($sub) => $sub->selectRaw('1')->from('transaction_checkins')->whereColumn('transaction_checkins.transaction_id', 'transactions.id'))
                    : $q->whereNotExists(fn ($sub) => $sub->selectRaw('1')->from('transaction_checkins')->whereColumn('transaction_checkins.transaction_id', 'transactions.id'));
            });
    }
}
