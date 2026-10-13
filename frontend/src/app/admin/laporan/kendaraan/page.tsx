import { redirect } from "next/navigation";
import ExportLink from "@/components/admin/export-link";
import ReportFilter from "@/components/admin/report-filter";
import { EmptyRow, ErrorNotice, MetricCard } from "@/components/admin/ui";
import { formatRupiah } from "@/lib/pricing/tariffs";
import { formatNumber } from "@/lib/reports/format";
import {
  readReportFilters,
  toQueryString,
  withResolvedPeriod,
} from "@/lib/reports/period";
import { fetchVehicleReport } from "@/lib/reports/server";

const BASE_PATH = "/admin/laporan/kendaraan";
const EXPORT_PATH = "/api/admin/reports/vehicles/export";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function VehicleReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = withResolvedPeriod(readReportFilters(params));
  const result = await fetchVehicleReport(filters);

  if (!result.ok) {
    if (result.kind === "unauthorized") redirect("/login");

    return <ErrorNotice message={result.message} />;
  }

  const { data, summary } = result.data;
  const query = toQueryString(filters);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Laporan Kendaraan</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Rekap per jenis kendaraan berdasarkan tanggal kunjungan. Semua jenis
            tetap ditampilkan, termasuk yang bernilai nol.
          </p>
        </div>
        <ExportLink href={`${EXPORT_PATH}?${query}`} />
      </div>

      <ReportFilter
        basePath={BASE_PATH}
        initial={filters}
        fields={["source"]}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <MetricCard
          label="Total kendaraan"
          value={formatNumber(summary.quantity)}
        />
        <MetricCard label="Nilai" value={formatRupiah(summary.subtotal)} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2 font-medium">Jenis kendaraan</th>
              <th className="px-3 py-2 text-right font-medium">Jumlah</th>
              <th className="px-3 py-2 text-right font-medium">Transaksi</th>
              <th className="px-3 py-2 text-right font-medium">Nilai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {data.length === 0 ? (
              <EmptyRow colSpan={4}>Belum ada jenis kendaraan.</EmptyRow>
            ) : (
              data.map((row) => (
                <tr key={row.code}>
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatNumber(row.quantity)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatNumber(row.transaction_count)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatRupiah(row.subtotal)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
