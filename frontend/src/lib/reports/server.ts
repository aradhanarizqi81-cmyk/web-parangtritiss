import { laravelFetch } from "@/lib/api/server";
import type { ApiResult } from "@/lib/api/types";
import { getSessionToken } from "@/lib/auth/session";
import { toQueryString } from "./period";
import type {
  DashboardSummary,
  IdentityRow,
  PageMeta,
  ReportFilters,
  TransactionRow,
  VehicleRow,
  VisitRow,
  VisitSummary,
} from "./types";

const NO_SESSION: ApiResult<never> = {
  ok: false,
  status: 401,
  kind: "unauthorized",
  message: "Sesi Anda tidak valid. Silakan masuk kembali.",
};

/**
 * Pembacaan data dashboard & laporan dari server component. Token diambil dari
 * cookie HttpOnly, jadi halaman tidak perlu memanggil BFF route handler sendiri.
 * Seluruh angka dihitung backend; klien hanya mengirim filter.
 */
async function get<T>(
  path: string,
  filters: ReportFilters,
): Promise<ApiResult<T>> {
  const token = await getSessionToken();

  if (!token) return NO_SESSION;

  const query = toQueryString(filters);

  return laravelFetch<T>(query === "" ? path : `${path}?${query}`, { token });
}

export function fetchDashboard(
  filters: ReportFilters,
): Promise<ApiResult<{ data: DashboardSummary }>> {
  return get<{ data: DashboardSummary }>("/api/v1/admin/dashboard", filters);
}

export function fetchVisitReport(
  filters: ReportFilters,
): Promise<
  ApiResult<{ data: VisitRow[]; meta: PageMeta; summary: VisitSummary }>
> {
  return get<{ data: VisitRow[]; meta: PageMeta; summary: VisitSummary }>(
    "/api/v1/admin/reports/visits",
    filters,
  );
}

export function fetchTransactionReport(
  filters: ReportFilters,
): Promise<
  ApiResult<{
    data: TransactionRow[];
    meta: PageMeta;
    summary: { transactions: number; revenue: { total: number; currency: string; basis: string } };
  }>
> {
  return get("/api/v1/admin/reports/transactions", filters);
}

export function fetchVehicleReport(
  filters: ReportFilters,
): Promise<
  ApiResult<{
    data: VehicleRow[];
    summary: { quantity: number; subtotal: number };
  }>
> {
  return get("/api/v1/admin/reports/vehicles", filters);
}

export function fetchIdentityReport(
  filters: ReportFilters,
): Promise<ApiResult<{ data: IdentityRow[]; meta: PageMeta }>> {
  return get<{ data: IdentityRow[]; meta: PageMeta }>(
    "/api/v1/admin/reports/identities",
    filters,
  );
}
