import StatusBadge from "./status-badge";
import { formatRupiah } from "@/lib/pricing/tariffs";

/**
 * Bentuk minimum yang dibutuhkan kartu tiket. Dipakai bersama oleh tiket loket
 * maupun tiket booking online; keduanya memenuhi bentuk ini. Sengaja tidak
 * menampilkan NIK lengkap, hanya nama dan NIK tersamarkan.
 */
export type PrintableTicket = {
  id: number;
  visitor_id: number;
  ticket_code: string;
  status: string;
  status_label: string;
  printed_at: string | null;
};

export type PrintableTransaction = {
  transaction_code: string;
  visit_date: string | null;
  total_amount: number;
  payment: { status_label: string } | null;
  visitors: { id: number; full_name: string; masked_nik: string }[];
};

export default function TicketCard({
  transaction,
  ticket,
}: {
  transaction: PrintableTransaction;
  ticket: PrintableTicket;
}) {
  const visitor = transaction.visitors.find(
    (candidate) => candidate.id === ticket.visitor_id,
  );

  return (
    <article className="break-inside-avoid rounded-lg border border-neutral-300 bg-white p-4">
      <header className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Tiket Wisatawan
        </p>
        <StatusBadge status={ticket.status} label={ticket.status_label} />
      </header>

      <p className="mt-2 font-mono text-lg font-semibold">
        {ticket.ticket_code}
      </p>

      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-neutral-500">Nama</dt>
          <dd className="text-neutral-900">{visitor?.full_name ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-neutral-500">NIK</dt>
          <dd className="font-mono text-xs text-neutral-700">
            {visitor?.masked_nik ?? "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-neutral-500">Tanggal kunjungan</dt>
          <dd className="text-neutral-900">{transaction.visit_date ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-neutral-500">Kode transaksi</dt>
          <dd className="font-mono text-xs text-neutral-700">
            {transaction.transaction_code}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-neutral-500">Total transaksi</dt>
          <dd className="text-neutral-900">
            {formatRupiah(transaction.total_amount)}
          </dd>
        </div>
      </dl>

      <p className="mt-3 border-t border-dashed border-neutral-200 pt-2 text-[11px] text-neutral-500">
        Pembayaran: {transaction.payment?.status_label ?? "—"}. Barcode gerbang
        belum aktif pada fase ini.
      </p>
    </article>
  );
}
