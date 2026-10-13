/**
 * Kontrak data dashboard & laporan admin (Fase 8). Bentuknya mengikuti resource
 * backend; seluruh angka berasal dari database dan tidak pernah dihitung ulang
 * di sini.
 */

export type PageMeta = {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number | null;
  to: number | null;
};

export type ReportFilters = {
  date_from?: string;
  date_to?: string;
  source?: string;
  status?: string;
  payment_status?: string;
  checked_in?: string;
  date_basis?: string;
  page?: string;
  per_page?: string;
};

export type DashboardSummary = {
  period: { date_from: string; date_to: string; timezone: string };
  transactions: {
    total: number;
    by_source: Record<string, number>;
    by_status: Record<string, number>;
    basis: string;
  };
  visitors: {
    registered: number;
    checked_in: number;
    checked_in_transactions: number;
    basis: string;
  };
  revenue: {
    total: number;
    currency: string;
    by_source: Record<string, number>;
    basis: string;
  };
  vehicles: { code: string; name: string; quantity: number }[];
};

export type VisitRow = {
  transaction_code: string;
  visit_date: string | null;
  source: string;
  source_label: string;
  status: string;
  status_label: string;
  registered_visitor_count: number;
  checked_in: boolean;
  checked_in_at: string | null;
  checked_in_visitor_count: number | null;
  validated_by: { id: number; name: string } | null;
};

export type VisitSummary = {
  transactions: number;
  registered_visitors: number;
  checked_in_visitors: number;
};

export type TransactionRow = {
  transaction_code: string;
  transaction_date: string | null;
  visit_date: string | null;
  source: string;
  source_label: string;
  status: string;
  status_label: string;
  visitor_count: number;
  vehicle_count: number;
  total_amount: number;
  payment: {
    method: string;
    method_label: string;
    status: string;
    status_label: string;
    paid_at: string | null;
  } | null;
};

export type VehicleRow = {
  vehicle_type_id: number;
  code: string;
  name: string;
  quantity: number;
  transaction_count: number;
  subtotal: number;
};

export type IdentityRow = {
  transaction_code: string | null;
  visit_date: string | null;
  source: string | null;
  source_label: string | null;
  full_name: string;
  masked_nik: string;
};

/** Label ringkas untuk agregat yang hanya berisi kode (dari backend). */
export const SOURCE_LABELS: Record<string, string> = {
  online: "Daring",
  counter: "Loket",
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu Pembayaran",
  paid: "Terbayar",
  checked_in: "Sudah Check-in",
  cancelled: "Dibatalkan",
};
