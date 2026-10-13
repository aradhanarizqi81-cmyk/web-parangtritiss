import { redirect } from "next/navigation";
import ExportLink from "@/components/admin/export-link";
import Pagination from "@/components/admin/pagination";
import ReportFilter from "@/components/admin/report-filter";
import { EmptyRow, ErrorNotice, MetricCard } from "@/components/admin/ui";
import StatusBadge from "@/components/counter/status-badge";
import { formatRupiah } from "@/lib/pricing/tariffs";
import { formatDateTime, formatNumber } from "@/lib/reports/format";
import {
  readReportFilters,
  toQueryString,
  withResolvedPeriod,
} from "@/lib/reports/period";
import { fetchTransactionReport } from "@/lib/reports/server";

const BASE_PATH = "/admin/laporan/transaksi";
const EXPORT_PATH = "/api/admin/reports/transactions/export";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TransactionReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = withResolvedPeriod(readReportFilters(params));
  const result = await fetchTransactionReport(filters);

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
          <h1 className="text-2xl font-semibold">Laporan Transaksi</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Rentang dapat dihitung dari tanggal transaksi dibuat, tanggal
            kunjungan, atau waktu pembayaran berhasil.
          </p>
        </div>
        <ExportLink href={`${EXPORT_PATH}?${query}`} />
      </div>

      <ReportFilter
        basePath={BASE_PATH}
        initial={filters}
        fields={["source", "status", "payment_status", "date_basis"]}
        paginated
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <MetricCard
          label="Transaksi"
          value={formatNumber(summary.transactions)}
        />
        <MetricCard
          label="Pendapatan"
          value={formatRupiah(summary.revenue.total)}
          hint={`Pembayaran berhasil · basis ${summary.revenue.basis}`}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[840px] text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2 font-medium">Kode</th>
              <th className="px-3 py-2 font-medium">Dibuat</th>
              <th className="px-3 py-2 font-medium">Kunjungan</th>
              <th className="px-3 py-2 font-medium">Sumber</th>
              <th className="px-3 py-2 text-right font-medium">Tamu</th>
              <th className="px-3 py-2 text-right font-medium">Kend.</th>
              <th className="px-3 py-2 text-right font-medium">Total</th>
              <th className="px-3 py-2 font-medium">Pembayaran</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {data.length === 0 ? (
              <EmptyRow colSpan={8}>
                Tidak ada transaksi pada rentang ini.
              </EmptyRow>
            ) : (
              data.map((row) => (
                <tr key={row.transaction_code}>
                  <td className="px-3 py-2 font-mono text-xs">
                    {row.transaction_code}
                  </td>
                  <td className="px-3 py-2">
                    {formatDateTime(row.transaction_date)}
                  </td>
                  <td className="px-3 py-2">{row.visit_date ?? "—"}</td>
                  <td className="px-3 py-2">{row.source_label}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatNumber(row.visitor_count)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatNumber(row.vehicle_count)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatRupiah(row.total_amount)}
                  </td>
                  <td className="px-3 py-2">
                    {row.payment ? (
                      <div className="flex flex-col gap-1">
                        <StatusBadge
                          status={row.payment.status}
                          label={row.payment.status_label}
                        />
                        <span className="text-xs text-neutral-500">
                          {row.payment.method_label}
                          {row.payment.paid_at
                            ? ` · ${formatDateTime(row.payment.paid_at)}`
                            : ""}
                        </span>
                      </div>
                    ) : (
                      "—"
                    )}
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
