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

/**
 * State penukaran tiket fisik booking online.
 *
 * `can_redeem`, `can_reprint` dan `block_reason` dihitung backend dari data
 * nyata (status pembayaran, jumlah tiket, redeemed_at). Frontend hanya
 * menampilkannya; backend tetap sumber kebenaran dan menolak ulang permintaan
 * yang tidak sah (422 belum lunas, 409 sudah ditukarkan).
 */
export type RedemptionState = {
  redeemed: boolean;
  redeemed_at: string | null;
  redeemed_by: { id: number; name: string } | null;
  status: string;
  status_label: string;
  can_redeem: boolean;
  can_reprint: boolean;
  block_reason: string | null;
};

/**
 * Tampilan meja penukaran setelah kode dipindai: ringkasan pesanan + status
 * penukaran. Sengaja terpisah dari BookingResource agar referensi simulasi
 * pembayaran (rahasia milik pengunjung) tidak pernah sampai ke loket, dan
 * NIK pengunjung hanya berupa `masked_nik`.
 */
export type RedemptionTransaction = {
  id: number;
  transaction_code: string;
  // Token barcode grup yang sudah tercetak di gelang dan dipindai di gerbang.
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
  visitors: CounterVisitor[];
  vehicles: CounterVehicle[];
  payment: CounterPayment | null;
  tickets: CounterTicket[];
  redemption: RedemptionState;
  created_at: string | null;
};

/**
 * Satu hak fasilitas pada satu tiket individual.
 *
 * `can_claim` dan `block_reason` dihitung backend dari pembayaran, check-in,
 * tanggal kunjungan, status transaksi, dan status hak itu sendiri. Frontend
 * hanya menampilkan; backend tetap menolak permintaan yang tidak sah (422)
 * atau klaim ganda (409).
 */
export type FacilityEntitlement = {
  entitlement_id: number;
  code: string | null;
  name: string | null;
  status: "granted" | "redeemed" | "void" | string;
  status_label: string;
  granted_at: string | null;
  redeemed_at: string | null;
  redeemed_by: { id: number; name: string } | null;
  voided_at: string | null;
  can_claim: boolean;
  block_reason: string | null;
};

/**
 * Tampilan meja fasilitas setelah kode tiket wristband dipindai.
 *
 * `ticket_code` adalah identitas tiket individual, bukan barcode grup gerbang
 * dan bukan kode penukaran online. NIK hanya tersedia dalam bentuk masked.
 */
export type FacilityTicket = {
  id: number;
  ticket_code: string;
  status: string;
  status_label: string;
  visitor: {
    id: number;
    full_name: string;
    masked_nik: string;
  } | null;
  transaction: {
    id: number;
    transaction_code: string;
    source: string;
    source_label: string;
    status: string;
    status_label: string;
    visit_date: string | null;
    visitor_count: number;
  } | null;
  payment: {
    status: string;
    status_label: string;
    paid_at: string | null;
  } | null;
  checkin: {
    checked_in: boolean;
    checked_in_at: string | null;
    visitor_count_checked_in: number | null;
  } | null;
  facilities: FacilityEntitlement[];
  created_at: string | null;
};
