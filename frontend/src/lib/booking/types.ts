/**
 * Kontrak data untuk alur booking online. Bentuknya mengikuti BookingResource
 * dan BookingSummaryResource di backend; NIK mentah tidak pernah ada di sini,
 * hanya `masked_nik`.
 */

export type BookingVisitorInput = {
  full_name: string;
  nik: string;
};

export type BookingVehicleInput = {
  vehicle_type_id: number;
  quantity: number;
};

export type BookingTicket = {
  id: number;
  visitor_id: number;
  ticket_code: string;
  status: string;
  status_label: string;
  printed_at: string | null;
};

export type BookingVisitor = {
  id: number;
  full_name: string;
  masked_nik: string;
};

export type BookingVehicle = {
  vehicle_type_id: number;
  code: string | null;
  name: string | null;
  quantity: number;
  unit_tariff: number;
  subtotal: number;
};

export type BookingPayment = {
  method: string;
  method_label: string;
  amount: number;
  status: string;
  status_label: string;
  paid_at: string | null;
  // Token simulasi yang diterbitkan server; hanya boleh dipakai pemilik booking.
  simulation_reference: string | null;
  received_by: { id: number; name: string } | null;
};

export type BookingTransaction = {
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
  owner: { id: number; name: string } | null;
  visitors: BookingVisitor[];
  vehicles: BookingVehicle[];
  payment: BookingPayment | null;
  tickets: BookingTicket[];
  created_at: string | null;
};

export type BookingSummary = {
  id: number;
  transaction_code: string;
  source: string;
  source_label: string;
  status: string;
  status_label: string;
  visit_date: string | null;
  visitor_count: number;
  total_amount: number;
  payment_status: string | null;
  payment_status_label: string | null;
  created_at: string | null;
};
