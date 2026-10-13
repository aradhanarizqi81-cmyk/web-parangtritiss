<?php

namespace App\Services\Reports;

use App\Enums\PaymentStatus;
use App\Models\Transaction;
use App\Support\ReportPeriod;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Laporan transaksi dan pendapatan.
 *
 * Daftar transaksi dapat disaring memakai salah satu basis tanggal
 * (`date_basis`): tanggal transaksi dibuat (`created_at`, default), tanggal
 * kunjungan (`visit_date`), atau waktu pembayaran sukses (`paid_at`).
 *
 * Ringkasan pendapatan SELALU memakai basis `paid_at` dan hanya menjumlahkan
 * pembayaran `success`; ringkasan ini diberi label sendiri agar tidak
 * tertukar dengan tanggal kunjungan atau tanggal transaksi.
 */
class TransactionReportService
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function paginate(ReportPeriod $period, array $filters): LengthAwarePaginator
    {
        return $this->query($period, $filters)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate((int) ($filters['per_page'] ?? config('report.per_page')))
            ->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array{transactions: int, revenue: array{total: int, currency: string, basis: string}}
     */
    public function summary(ReportPeriod $period, array $filters): array
    {
        $revenue = (int) DB::table('payments')
            ->join('transactions', 'transactions.id', '=', 'payments.transaction_id')
            ->where('payments.status', PaymentStatus::Success->value)
            ->whereBetween('payments.paid_at', [$period->fromUtc(), $period->toUtc()])
            ->when($filters['source'] ?? null, fn ($q, $source) => $q->where('transactions.source', $source))
            ->sum('payments.amount');

        return [
            'transactions' => (int) $this->query($period, $filters)->count(),
            'revenue' => [
                'total' => $revenue,
                'currency' => 'IDR',
                'basis' => 'paid_at',
            ],
        ];
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
        return ['Kode Transaksi', 'Tanggal Transaksi', 'Tanggal Kunjungan', 'Sumber', 'Pengunjung', 'Kendaraan', 'Total', 'Status Pembayaran', 'Waktu Pembayaran'];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return \Generator<int, array<int, mixed>>
     */
    public function exportRows(ReportPeriod $period, array $filters): \Generator
    {
        $items = $this->query($period, $filters)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        foreach ($items as $transaction) {
            yield [
                $transaction->transaction_code,
                $transaction->created_at?->toIso8601String(),
                $transaction->visit_date?->toDateString(),
                $transaction->source->value,
                $transaction->visitor_count,
                (int) ($transaction->vehicle_count ?? 0),
                $transaction->total_amount,
                $transaction->payment?->status->value ?? '',
                $transaction->payment?->paid_at?->toIso8601String() ?? '',
            ];
        }
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Builder<Transaction>
     */
    private function query(ReportPeriod $period, array $filters): Builder
    {
        $basis = $filters['date_basis'] ?? 'created_at';

        return Transaction::query()
            ->with('payment')
            ->withSum('transactionVehicles as vehicle_count', 'quantity')
            ->when($basis === 'visit_date', fn (Builder $q) => $q
                ->where('visit_date', '>=', $period->fromDate())
                ->where('visit_date', '<', $period->endDateExclusive()))
            ->when($basis === 'paid_at', fn (Builder $q) => $q->whereHas('payment', fn ($p) => $p->whereBetween('paid_at', [$period->fromUtc(), $period->toUtc()])))
            ->when(! in_array($basis, ['visit_date', 'paid_at'], true), fn (Builder $q) => $q->whereBetween('created_at', [$period->fromUtc(), $period->toUtc()]))
            ->when($filters['source'] ?? null, fn (Builder $q, $source) => $q->where('source', $source))
            ->when($filters['status'] ?? null, fn (Builder $q, $status) => $q->where('status', $status))
            ->when($filters['payment_status'] ?? null, fn (Builder $q, $status) => $q->whereHas('payment', fn ($p) => $p->where('status', $status)));
    }
}
