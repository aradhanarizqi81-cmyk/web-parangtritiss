<?php

namespace App\Services\Reports;

use App\Enums\PaymentStatus;
use App\Support\ReportPeriod;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Ringkasan operasional untuk dashboard admin.
 *
 * Setiap metrik dihitung langsung dari database dan secara eksplisit memakai
 * basis tanggalnya sendiri, sehingga angka tidak tertukar:
 *
 * - jumlah transaksi & sebaran sumber/status  -> kolom `created_at`
 * - wisatawan terdaftar & pengunjung hadir    -> kolom `visit_date`
 * - pendapatan                                -> kolom `payments.paid_at`
 *
 * Pendapatan hanya dijumlahkan dari pembayaran berstatus `success`, bukan dari
 * `transactions.total_amount`.
 */
class DashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function summary(ReportPeriod $period): array
    {
        $fromUtc = $period->fromUtc();
        $toUtc = $period->toUtc();
        $fromDate = $period->fromDate();
        $toExclusive = $period->endDateExclusive();

        $transactionsBySource = DB::table('transactions')
            ->whereBetween('created_at', [$fromUtc, $toUtc])
            ->selectRaw('source, COUNT(*) as aggregate')
            ->groupBy('source')
            ->pluck('aggregate', 'source');

        $transactionsByStatus = DB::table('transactions')
            ->whereBetween('created_at', [$fromUtc, $toUtc])
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $registeredVisitors = (int) DB::table('visitors')
            ->join('transactions', 'transactions.id', '=', 'visitors.transaction_id')
            ->where('transactions.visit_date', '>=', $fromDate)
            ->where('transactions.visit_date', '<', $toExclusive)
            ->count();

        $checkins = fn () => DB::table('transaction_checkins')
            ->join('transactions', 'transactions.id', '=', 'transaction_checkins.transaction_id')
            ->where('transactions.visit_date', '>=', $fromDate)
            ->where('transactions.visit_date', '<', $toExclusive);

        $checkedInTransactions = (int) $checkins()->count();
        $checkedInVisitors = (int) $checkins()->sum('transaction_checkins.visitor_count_checked_in');

        $revenueBySource = DB::table('payments')
            ->join('transactions', 'transactions.id', '=', 'payments.transaction_id')
            ->where('payments.status', PaymentStatus::Success->value)
            ->whereBetween('payments.paid_at', [$fromUtc, $toUtc])
            ->selectRaw('transactions.source as source, SUM(payments.amount) as aggregate')
            ->groupBy('transactions.source')
            ->pluck('aggregate', 'source');

        return [
            'period' => [
                'date_from' => $period->fromDate(),
                'date_to' => $period->toDate(),
                'timezone' => $period->timezone,
            ],
            'transactions' => [
                'total' => (int) $transactionsBySource->sum(),
                'by_source' => $this->withZeroKeys($transactionsBySource, ['online', 'counter']),
                'by_status' => $this->withZeroKeys($transactionsByStatus, ['pending', 'paid', 'checked_in', 'cancelled']),
                'basis' => 'created_at',
            ],
            'visitors' => [
                'registered' => $registeredVisitors,
                'checked_in' => $checkedInVisitors,
                'checked_in_transactions' => $checkedInTransactions,
                'basis' => 'visit_date',
            ],
            'revenue' => [
                'total' => (int) $revenueBySource->sum(),
                'currency' => 'IDR',
                'by_source' => $this->withZeroKeys($revenueBySource, ['online', 'counter']),
                'basis' => 'paid_at',
            ],
            'vehicles' => $this->vehiclesByType($fromDate, $toExclusive),
        ];
    }

    /**
     * Rekap jumlah kendaraan per jenis. Semua jenis kendaraan tetap muncul,
     * bernilai nol bila tidak ada aktivitas pada rentang.
     *
     * @return array<int, array{code: string, name: string, quantity: int}>
     */
    private function vehiclesByType(string $fromDate, string $toExclusive): array
    {
        return DB::table('vehicle_types')
            ->leftJoinSub(
                DB::table('transaction_vehicles')
                    ->join('transactions', 'transactions.id', '=', 'transaction_vehicles.transaction_id')
                    ->where('transactions.visit_date', '>=', $fromDate)
                    ->where('transactions.visit_date', '<', $toExclusive)
                    ->selectRaw('transaction_vehicles.vehicle_type_id as vehicle_type_id, SUM(transaction_vehicles.quantity) as quantity')
                    ->groupBy('transaction_vehicles.vehicle_type_id'),
                'agg',
                'agg.vehicle_type_id',
                '=',
                'vehicle_types.id',
            )
            ->orderBy('vehicle_types.id')
            ->get([
                'vehicle_types.code',
                'vehicle_types.name',
                DB::raw('COALESCE(agg.quantity, 0) as quantity'),
            ])
            ->map(fn ($row): array => [
                'code' => (string) $row->code,
                'name' => (string) $row->name,
                'quantity' => (int) $row->quantity,
            ])
            ->all();
    }

    /**
     * Pastikan seluruh kunci standar muncul meski tanpa data.
     *
     * @param  Collection<string, mixed>  $values
     * @param  array<int, string>  $keys
     * @return array<string, int>
     */
    private function withZeroKeys(Collection $values, array $keys): array
    {
        $result = [];

        foreach ($keys as $key) {
            $result[$key] = (int) ($values[$key] ?? 0);
        }

        return $result;
    }
}
