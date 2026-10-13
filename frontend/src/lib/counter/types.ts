/**
 * Kontrak data untuk alur loket (counter). Bentuknya mengikuti
 * CounterTransactionResource di backend; NIK mentah tidak pernah ada di sini,
 * hanya `masked_nik`.
 *
 * Katalog tarif (`TariffCatalog`) dan estimasi biaya dipakai bersama dengan
 * alur booking online, lihat `@/lib/pricing/tariffs`.
 */

export type CounterVisitorInput = {
  full_name: string;
  nik: string;
};

export type CounterVehicleInput = {
  vehicle_type_id: number;
  quantity: number;
};

export type CounterTicket = {
  id: number;
  visitor_id: number;
  ticket_code: string;
  status: string;
  status_label: string;
  printed_at: string | null;
};

export type CounterVisitor = {
  id: number;
  full_name: string;
  masked_nik: string;
};

export type CounterVehicle = {
  vehicle_type_id: number;
  code: string | null;
  name: string | null;
  quantity: number;
  unit_tariff: number;
  subtotal: number;
};

export type CounterPayment = {
  method: string;
  method_label: string;
  amount: number;
  status: string;
  status_label: string;
  paid_at: string | null;
  received_by: { id: number; name: string } | null;
};

export type CounterTransaction = {
  id: number;
  transaction_code: string;
  // Token barcode grup untuk gerbang; tanpa data pribadi.
  barcode_token: string;
  source: string;
  source_label: string;
  status: string;
  status_label: string;
  visit_date: string | null;
  visitor_count: number;
  visitor_unit_tariff: number;
  visitor_total: number;
  vehicle_total: number;
  total_amount: number;
  cashier: { id: number; name: string } | null;
  visitors: CounterVisitor[];
  vehicles: CounterVehicle[];
  payment: CounterPayment | null;
  tickets: CounterTicket[];
  created_at: string | null;
};
