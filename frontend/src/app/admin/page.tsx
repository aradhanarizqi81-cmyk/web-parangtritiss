import { redirect } from "next/navigation";
import ReportFilter from "@/components/admin/report-filter";
import { ErrorNotice, MetricCard } from "@/components/admin/ui";
import { formatRupiah } from "@/lib/pricing/tariffs";
import { formatNumber } from "@/lib/reports/format";
import { readDateFilters, withResolvedPeriod } from "@/lib/reports/period";
import { fetchDashboard } from "@/lib/reports/server";
import { SOURCE_LABELS, STATUS_LABELS } from "@/lib/reports/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = withResolvedPeriod(readDateFilters(params));
  const result = await fetchDashboard(filters);

  if (!result.ok) {
    if (result.kind === "unauthorized") redirect("/login");

    return <ErrorNotice message={result.message} />;
  }

  const { period, transactions, visitors, revenue, vehicles } = result.data.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ringkasan Operasional</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Periode {period.date_from} sampai {period.date_to} ({period.timezone}).
          Seluruh angka dihitung dari database.
        </p>
      </div>

      <ReportFilter basePath="/admin" initial={filters} fields={[]} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Transaksi dibuat"
          value={formatNumber(transactions.total)}
          hint="Basis: tanggal transaksi dibuat"
        />
        <MetricCard
          label="Wisatawan terdaftar"
          value={formatNumber(visitors.registered)}
          hint="Basis: tanggal kunjungan"
        />
        <MetricCard
          label="Pengunjung hadir"
          value={formatNumber(visitors.checked_in)}
          hint={`Dari ${formatNumber(visitors.checked_in_transactions)} transaksi check-in`}
        />
        <MetricCard
          label="Pendapatan"
          value={formatRupiah(revenue.total)}
          hint="Pembayaran berhasil (waktu bayar)"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold">Transaksi per sumber</h2>
          <dl className="mt-3 space-y-1 text-sm">
            {Object.entries(transactions.by_source).map(([code, count]) => (
              <div key={code} className="flex justify-between">
                <dt className="text-neutral-600">
                  {SOURCE_LABELS[code] ?? code}
                </dt>
                <dd className="tabular-nums">{formatNumber(count)}</dd>
              </div>
            ))}
          </dl>

          <h2 className="mt-5 text-sm font-semibold">Transaksi per status</h2>
          <dl className="mt-3 space-y-1 text-sm">
            {Object.entries(transactions.by_status).map(([code, count]) => (
              <div key={code} className="flex justify-between">
                <dt className="text-neutral-600">{STATUS_LABELS[code] ?? code}</dt>
                <dd className="tabular-nums">{formatNumber(count)}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold">Pendapatan per sumber</h2>
          <dl className="mt-3 space-y-1 text-sm">
            {Object.entries(revenue.by_source).map(([code, total]) => (
              <div key={code} className="flex justify-between">
                <dt className="text-neutral-600">
                  {SOURCE_LABELS[code] ?? code}
                </dt>
                <dd className="tabular-nums">{formatRupiah(total)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-sm font-semibold">
            Total {formatRupiah(revenue.total)}
          </p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold">Kendaraan</h2>
          <dl className="mt-3 space-y-1 text-sm">
            {vehicles.map((vehicle) => (
              <div key={vehicle.code} className="flex justify-between">
                <dt className="text-neutral-600">{vehicle.name}</dt>
                <dd className="tabular-nums">{formatNumber(vehicle.quantity)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
