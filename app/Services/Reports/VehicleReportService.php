<?php

namespace App\Services\Reports;

use App\Support\ReportPeriod;
use Illuminate\Support\Facades\DB;

/**
 * Rekap kendaraan berdasarkan jenis.
 *
 * Dihitung dari snapshot `transaction_vehicles` pada transaksi yang tanggal
 * kunjungannya (`visit_date`) berada dalam rentang. Semua jenis kendaraan tetap
 * ditampilkan, bernilai nol bila tidak ada aktivitas.
 */
class VehicleReportService
{
    /**
     * @param  array<string, mixed>  $filters
     * @return array{data: array<int, array<string, mixed>>, summary: array{quantity: int, subtotal: int}}
     */
    public function report(ReportPeriod $period, array $filters): array
    {
        $rows = DB::table('vehicle_types')
            ->leftJoinSub(
                DB::table('transaction_vehicles')
                    ->join('transactions', 'transactions.id', '=', 'transaction_vehicles.transaction_id')
                    ->where('transactions.visit_date', '>=', $period->fromDate())
                    ->where('transactions.visit_date', '<', $period->endDateExclusive())
                    ->when($filters['source'] ?? null, fn ($q, $source) => $q->where('transactions.source', $source))
                    ->selectRaw('transaction_vehicles.vehicle_type_id as vehicle_type_id, SUM(transaction_vehicles.quantity) as quantity, SUM(transaction_vehicles.subtotal) as subtotal, COUNT(DISTINCT transaction_vehicles.transaction_id) as transaction_count')
                    ->groupBy('transaction_vehicles.vehicle_type_id'),
                'agg',
                'agg.vehicle_type_id',
                '=',
                'vehicle_types.id',
            )
            ->orderBy('vehicle_types.id')
            ->get([
                'vehicle_types.id as vehicle_type_id',
                'vehicle_types.code',
                'vehicle_types.name',
                DB::raw('COALESCE(agg.quantity, 0) as quantity'),
                DB::raw('COALESCE(agg.subtotal, 0) as subtotal'),
                DB::raw('COALESCE(agg.transaction_count, 0) as transaction_count'),
            ])
            ->map(fn ($row): array => [
                'vehicle_type_id' => (int) $row->vehicle_type_id,
                'code' => (string) $row->code,
                'name' => (string) $row->name,
                'quantity' => (int) $row->quantity,
                'transaction_count' => (int) $row->transaction_count,
                'subtotal' => (int) $row->subtotal,
            ])
            ->all();

        return [
            'data' => $rows,
            'summary' => [
                'quantity' => (int) array_sum(array_column($rows, 'quantity')),
                'subtotal' => (int) array_sum(array_column($rows, 'subtotal')),
            ],
        ];
    }

    /**
     * @return array<int, string>
     */
    public function exportHeader(): array
    {
        return ['Jenis Kendaraan', 'Jumlah Kendaraan', 'Jumlah Transaksi', 'Nilai'];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return \Generator<int, array<int, mixed>>
     */
    public function exportRows(ReportPeriod $period, array $filters): \Generator
    {
        foreach ($this->report($period, $filters)['data'] as $row) {
            yield [
                $row['name'],
                $row['quantity'],
                $row['transaction_count'],
                $row['subtotal'],
            ];
        }
    }
}
