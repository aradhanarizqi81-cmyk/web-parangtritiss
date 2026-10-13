import { redirect } from "next/navigation";
import ExportLink from "@/components/admin/export-link";
import Pagination from "@/components/admin/pagination";
import ReportFilter from "@/components/admin/report-filter";
import { EmptyRow, ErrorNotice } from "@/components/admin/ui";
import {
  readReportFilters,
  toQueryString,
  withResolvedPeriod,
} from "@/lib/reports/period";
import { fetchIdentityReport } from "@/lib/reports/server";

const BASE_PATH = "/admin/laporan/identitas";
const EXPORT_PATH = "/api/admin/reports/identities/export";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function IdentityReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = withResolvedPeriod(readReportFilters(params));
  const result = await fetchIdentityReport(filters);

  if (!result.ok) {
    if (result.kind === "unauthorized") redirect("/login");

    return <ErrorNotice message={result.message} />;
  }

  const { data, meta } = result.data;
  const query = toQueryString({ ...filters, page: undefined });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Laporan Identitas</h1>
          <p className="mt-1 text-sm text-neutral-600">
            NIK hanya ditampilkan dalam bentuk tersamarkan. NIK mentah tidak
            pernah dikirim ke browser maupun disertakan pada ekspor.
          </p>
        </div>
        <ExportLink href={`${EXPORT_PATH}?${query}`} />
      </div>

      <ReportFilter
        basePath={BASE_PATH}
        initial={filters}
        fields={["source"]}
        paginated
      />

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2 font-medium">Kode transaksi</th>
              <th className="px-3 py-2 font-medium">Tanggal kunjungan</th>
              <th className="px-3 py-2 font-medium">Sumber</th>
              <th className="px-3 py-2 font-medium">Nama</th>
              <th className="px-3 py-2 font-medium">NIK (tersamarkan)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {data.length === 0 ? (
              <EmptyRow colSpan={5}>
                Tidak ada data identitas pada rentang ini.
              </EmptyRow>
            ) : (
              data.map((row, index) => (
                <tr key={`${row.transaction_code}-${index}`}>
                  <td className="px-3 py-2 font-mono text-xs">
                    {row.transaction_code ?? "—"}
                  </td>
                  <td className="px-3 py-2">{row.visit_date ?? "—"}</td>
                  <td className="px-3 py-2">{row.source_label ?? "—"}</td>
                  <td className="px-3 py-2">{row.full_name}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {row.masked_nik}
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
