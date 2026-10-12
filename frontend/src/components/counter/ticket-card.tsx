import StatusBadge from "./status-badge";
import { formatRupiah } from "@/lib/counter/estimate";
import type { CounterTicket, CounterTransaction } from "@/lib/counter/types";

/**
 * Kartu tiket individual yang siap dicetak. Sengaja tidak menampilkan NIK
 * lengkap, hanya nama dan NIK tersamarkan.
 */
export default function TicketCard({
  transaction,
  ticket,
}: {
  transaction: CounterTransaction;
  ticket: CounterTicket;
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
