import { io } from "next/cache";
import { redirect } from "next/navigation";
import ExportLink from "@/components/admin/export-link";
import Pagination from "@/components/admin/pagination";
import ReportFilter from "@/components/admin/report-filter";
import { EmptyRow, ErrorNotice, MetricCard } from "@/components/admin/ui";
import StatusBadge from "@/components/counter/status-badge";
import { formatDateTime, formatNumber } from "@/lib/reports/format";
import {
  readReportFilters,
  toQueryString,
  withResolvedPeriod,
} from "@/lib/reports/period";
import { fetchVisitReport } from "@/lib/reports/server";

const BASE_PATH = "/admin/laporan/kunjungan";
const EXPORT_PATH = "/api/admin/reports/visits/export";

// Halaman boleh memblokir: membaca cookie sesi + data terbaru dari Laravel.
export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function VisitReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Periode default memakai jam server, jadi harus dihitung saat request
  // (bukan saat prerender Cache Components).
  await io();
  const params = await searchParams;
  const filters = withResolvedPeriod(readReportFilters(params));
  const result = await fetchVisitReport(filters);

  if (!result.ok) {
    if (result.kind === "unauthorized") redirect("/login");

    return <ErrorNotice message={result.message} />;
  }

  const { data, meta, summary } = result.data;
  const query = toQueryString({ ...filters, page: undefined });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Laporan Kunjungan</h1>
          <p className="mt-1 text-sm text-muted">
            Satu baris mewakili satu transaksi pada tanggal kunjungannya.
            Wisatawan terdaftar dan pengunjung hadir dihitung terpisah.
          </p>
        </div>
        <ExportLink href={`${EXPORT_PATH}?${query}`} />
      </div>

      <ReportFilter
        basePath={BASE_PATH}
        initial={filters}
        fields={["source", "status", "checked_in"]}
        paginated
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Transaksi"
          value={formatNumber(summary.transactions)}
        />
        <MetricCard
          label="Wisatawan terdaftar"
          value={formatNumber(summary.registered_visitors)}
        />
        <MetricCard
          label="Pengunjung hadir"
          value={formatNumber(summary.checked_in_visitors)}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-surface-soft text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Kode</th>
              <th className="px-3 py-2 font-medium">Tanggal kunjungan</th>
              <th className="px-3 py-2 font-medium">Sumber</th>
              <th className="px-3 py-2 text-right font-medium">Terdaftar</th>
              <th className="px-3 py-2 text-right font-medium">Hadir</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Waktu check-in</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.length === 0 ? (
              <EmptyRow colSpan={7}>
                Tidak ada kunjungan pada rentang ini.
              </EmptyRow>
            ) : (
              data.map((row) => (
                <tr key={row.transaction_code}>
                  <td className="px-3 py-2 font-mono text-xs">
                    {row.transaction_code}
                  </td>
                  <td className="px-3 py-2">{row.visit_date ?? "—"}</td>
                  <td className="px-3 py-2">{row.source_label}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatNumber(row.registered_visitor_count)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.checked_in
                      ? formatNumber(row.checked_in_visitor_count ?? 0)
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      status={row.status}
                      label={row.status_label}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {row.checked_in ? formatDateTime(row.checked_in_at) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination meta={meta} basePath={BASE_PATH} query={query} />
    </div>
  );
}
