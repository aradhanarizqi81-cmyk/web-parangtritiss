import { io } from "next/cache";
import { redirect } from "next/navigation";
import ReportFilter from "@/components/admin/report-filter";
import { ErrorNotice } from "@/components/admin/ui";
import Card from "@/components/ui/card";
import { formatRupiah } from "@/lib/pricing/tariffs";
import { formatNumber } from "@/lib/reports/format";
import { readDateFilters, withResolvedPeriod } from "@/lib/reports/period";
import { fetchDashboard } from "@/lib/reports/server";
import { SOURCE_LABELS, STATUS_LABELS } from "@/lib/reports/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/* ------------------------------------------------------------------ */
/* Grafik SVG ringan (tanpa dependensi eksternal)                     */
/* ------------------------------------------------------------------ */

function DonutChart({
  value,
  total,
  label,
  color,
}: {
  value: number;
  total: number;
  label: string;
  color: string;
}) {
  const pct = total === 0 ? 0 : value / total;
  const sweep = pct >= 1 ? 0 : 1;
  const largeArc = pct > 0.5 ? 1 : 0;
  const endX = 60 + 50 * Math.sin(pct * 2 * Math.PI);
  const endY = 60 - 50 * Math.cos(pct * 2 * Math.PI);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24 shrink-0">
          <svg className="w-full h-full" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke="slate-200"
              strokeWidth="10"
              fill="none"
            />
            <path
              d={`M 60 10 A 50 50 0 ${largeArc} ${sweep} ${endX} ${endY}`}
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-foreground">{pct === 0 ? "0" : Math.round(pct * 100)}%</span>
            <span className="text-xs text-muted">{label}</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {label}
          </p>
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {formatNumber(value)}
          </p>
          <p className="text-xs text-muted">
            Dari {formatNumber(total)}
          </p>
        </div>
      </div>
    </Card>
  );
}

function BarChart({
  items,
  label,
}: {
  items: Array<{ name: string; value: number }>;
  label: string;
}) {
  const max = Math.max(0, ...items.map((i) => i.value), 1);

  return (
    <Card className="p-4">
      <p className="text-sm font-semibold mb-3 text-foreground">{label}</p>
      <div className="space-y-3">
        {items.map((item) => {
          const pct = max === 0 ? 0 : (item.value / max) * 100;
          return (
            <div key={item.name} className="flex items-center gap-3">
              <span className="w-20 text-xs text-muted shrink-0">{item.name}</span>
              <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 text-xs text-right tabular-nums text-foreground">
                {formatNumber(item.value)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function LineChart({
  items,
  label,
}: {
  items: Array<{ name: string; value: number }>;
  label: string;
}) {
  if (items.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm font-semibold mb-3 text-foreground">{label}</p>
        <p className="text-sm text-muted">Tidak ada data untuk ditampilkan.</p>
      </Card>
    );
  }

  const max = Math.max(0, ...items.map((i) => i.value), 1);
  const width = 280;
  const height = 120;
  const padding = 20;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  const points = items.map((_, i) => {
    const x = padding + (i / (items.length - 1 || 1)) * plotWidth;
    const y = height - padding - (items[i].value / max) * plotHeight;
    return `${x},${y}`;
  }).join(" ");

  const areaPoints = [
    `M ${padding} ${height - padding}`,
    ...points.split(" ").map((p) => `L ${p}`),
    `L ${width - padding} ${height - padding}`,
    `Z`,
  ].join(" ");

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <span className="text-xs text-muted">
          Maks: {formatNumber(max)}
        </span>
      </div>
      <div className="w-full h-32">
        <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#1fa5a8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1fa5a8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPoints} fill="url(#grad)" />
          <polyline
            points={points}
            stroke="#1fa5a8"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {items.map((_, i) => {
            const x = padding + (i / (items.length - 1 || 1)) * plotWidth;
            const y = height - padding - (items[i].value / max) * plotHeight;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3"
                fill="#1fa5a8"
              />
            );
          })}
        </svg>
      </div>
      <div className="flex justify-between text-xs text-muted mt-2 px-1">
        {items.map((item) => (
          <span key={item.name} className="text-center w-full">
            {item.name}
          </span>
        ))}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Halaman dasbor                                                     */
/* ------------------------------------------------------------------ */

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await io();
  const params = await searchParams;
  const filters = withResolvedPeriod(readDateFilters(params));
  const result = await fetchDashboard(filters);

  if (!result.ok) {
    if (result.kind === "unauthorized") redirect("/login");
    return <ErrorNotice message={result.message} />;
  }

  const { period, transactions, visitors, revenue, vehicles } = result.data.data;

  const notCheckedIn = Math.max(0, visitors.registered - visitors.checked_in);

  const revenueBySource = Object.entries(revenue.by_source).map(([code, total]) => ({
    name: SOURCE_LABELS[code] ?? code,
    value: total,
  }));

  const topVehicles = [...vehicles]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)
    .map((v) => ({ name: v.name, value: v.quantity }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Administrator
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            Welcome admin!
          </h1>
          <p className="mt-2 text-sm text-muted">
            Seluruh angka dihitung dari database periode{' '}
            {period.date_from} sampai {period.date_to}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari…"
              className="pl-9 pr-3 py-2 text-sm border border-line rounded-lg bg-surface focus:border-ocean focus:outline-none focus:ring-1 focus:ring-ocean"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <button className="w-10 h-10 rounded-lg border border-line bg-surface flex items-center justify-center text-muted hover:bg-accent-soft hover:text-ocean transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
        </div>
      </header>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5 sm:p-6 border border-line">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Total Products
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
            {formatNumber(visitors.registered)}
          </p>
          <p className="mt-1 text-xs text-muted">
            Wisatawan terdaftar
          </p>
        </Card>
        <Card className="p-5 sm:p-6 border border-line">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Orders
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
            {formatNumber(transactions.total)}
          </p>
          <p className="mt-1 text-xs text-muted">
            Transaksi dibuat
          </p>
        </Card>
        <Card className="p-5 sm:p-6 border border-line">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Total Stock
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
            {formatNumber(visitors.checked_in)}
          </p>
          <p className="mt-1 text-xs text-muted">
            Pengunjung hadir
          </p>
        </Card>
        <Card className="p-5 sm:p-6 border border-line">
          <p className="text-xs font-medium uppercase tracking-wide text-muted text-danger">
            Out of Stock
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-danger">
            {formatNumber(notCheckedIn)}
          </p>
          <p className="mt-1 text-xs text-muted">
            Belum check-in
          </p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DonutChart
            value={visitors.checked_in}
            total={visitors.registered}
            label="Check-in Rate"
            color="teal-500"
          />
        </div>
        <div className="lg:col-span-1">
          <BarChart
            items={topVehicles}
            label="Top Kendaraan"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <LineChart
          items={revenueBySource}
          label="Pendapatan per Sumber"
        />
        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-3 text-foreground">
            Aktivitas Terbaru
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted">
                    Transaksi
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted">
                    Sumber
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted">
                    Status
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted">
                    Jumlah
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {Object.entries(transactions.by_source).map(([source, count]) => (
                  <tr key={source} className="hover:bg-accent-soft transition-colors">
                    <td className="px-3 py-3">
                      <span className="font-medium text-foreground">{SOURCE_LABELS[source] ?? source}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-muted">{count} transaksi</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-accent-soft text-accent">
                        Aktif
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">
                      {formatNumber(count)}
                    </td>
                  </tr>
                ))}
                {Object.entries(transactions.by_status).map(([status, count]) => (
                  <tr key={status} className="hover:bg-accent-soft transition-colors">
                    <td className="px-3 py-3">
                      <span className="font-medium text-foreground">{STATUS_LABELS[status] ?? status}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-muted">{count} transaksi</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-warning-soft text-warning">
                        Pending
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">
                      {formatNumber(count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Ringkasan pendapatan & kendaraan di bawah */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-3 text-foreground">
            Pendapatan Total
          </h2>
          <div className="text-3xl font-bold tabular-nums text-foreground mb-1">
            {formatRupiah(revenue.total)}
          </div>
          <p className="text-xs text-muted">
            Berdasarkan pembayaran berhasil (waktu bayar)
          </p>
          <div className="mt-4 space-y-2">
            {Object.entries(revenue.by_source).map(([code, total]) => (
              <div key={code} className="flex justify-between text-sm">
                <span className="text-muted">{SOURCE_LABELS[code] ?? code}</span>
                <span className="tabular-nums text-foreground">{formatRupiah(total)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-3 text-foreground">
            Kendaraan
          </h2>
          <div className="space-y-3">
            {vehicles.map((vehicle) => (
              <div key={vehicle.code} className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {vehicle.name}
                  </p>
                  <p className="text-xs text-muted">{vehicle.code}</p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {formatNumber(vehicle.quantity)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
