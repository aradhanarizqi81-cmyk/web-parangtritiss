/**
 * Kontrak data untuk validasi gerbang. Bentuknya mengikuti GateCheckinResource
 * di backend; NIK mentah maupun token barcode tidak pernah ada di sini.
 */

export type GateValidatedBy = {
  id: number;
  name: string;
};

export type GateCheckinResult = {
  transaction_code: string;
  source: string;
  source_label: string;
  status: string;
  status_label: string;
  visit_date: string | null;
  visitor_count: number;
  checked_in_at: string | null;
  validated_by: GateValidatedBy | null;
};

export type GateCheckinResponse = {
  message: string;
  data: GateCheckinResult;
};
