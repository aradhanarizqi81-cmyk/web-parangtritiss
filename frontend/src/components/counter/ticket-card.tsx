
import BarcodeSvg from "@/components/barcode-svg";
import StatusBadge from "./status-badge";
import { formatRupiah } from "@/lib/pricing/tariffs";

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
  barcode_token: string;
  visit_date: string | null;
  total_amount: number;
  payment: { status_label: string } | null;
  visitors: {
    id: number;
    full_name: string;
    masked_nik: string;
  }[];
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
    <article
      className="
        ticket-band relative mx-auto w-full min-w-0
        overflow-hidden rounded-xl border border-teal-800/20
        bg-white shadow-sm
        print:break-inside-avoid print:rounded-none
        print:border-0 print:shadow-none
      "
    >
      {/* Gelang: bagian utama dan area kode */}
      <div
        className="
          relative grid min-w-0
          grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,260px)]
          print:grid-cols-[minmax(0,1fr)_minmax(0,420px)]
        "
      >
        {/* Panel desain utama */}
        <div
          className="
            relative min-w-0 overflow-hidden
            bg-gradient-to-br from-[#103f3c]
            via-[#087f7a] to-[#35bdb0]
            px-4 py-5 text-ivory
            sm:px-6
            print:px-4 print:py-3
          "
        >
          {/* Dekorasi ombak */}
          <div
            aria-hidden="true"
            className="
              pointer-events-none absolute inset-x-0 bottom-0 h-16
              opacity-20
            "
            style={{
              background:
                "repeating-linear-gradient(170deg, transparent 0 12px, #e4d3a5 13px 15px, transparent 16px 25px)",
            }}
          />

          <div className="relative">
            <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#e8d7a9]">
              Pesona Pesisir Yogyakarta
            </p>

            <h2 className="mt-1 text-xl font-bold leading-tight tracking-wide sm:text-2xl print:text-lg">
              PANTAI
              <br />
              PARANGTRITIS
            </h2>

            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white/85">
              Tiket Masuk Wisata
            </p>

            <div className="mt-4 border-t border-white/25 pt-3">
              <p className="text-[9px] uppercase tracking-[0.18em] text-[#f0dba5]">
                Tanggal kunjungan
              </p>
              <p className="mt-1 break-words text-sm font-bold sm:text-base print:text-sm">
                {transaction.visit_date ?? "—"}
              </p>

              <p className="mt-3 text-[9px] uppercase tracking-[0.18em] text-[#f0dba5]">
                Kode tiket
              </p>
              <p className="mt-1 break-all font-mono text-xs font-semibold print:text-[10px]">
                {ticket.ticket_code}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap items-end justify-between gap-2 border-t border-white/25 pt-3">
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-wider text-white/70">
                  Pengunjung
                </p>
                <p className="max-w-full break-words text-xs font-semibold">
                  {visitor?.full_name ?? "—"}
                </p>
              </div>

              <div className="shrink-0 print:hidden">
                <StatusBadge
                  status={ticket.status}
                  label={ticket.status_label}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Panel barcode */}
        <div
          className="
            flex min-w-0 flex-col justify-center gap-2
            border-t border-dashed border-teal-800/25
            bg-[#faf8f0] p-4
            sm:border-l sm:border-t-0
            print:border-l print:border-t-0 print:p-3
          "
        >
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ocean">
            Validasi gerbang
          </p>

          <div
            className="
              mx-auto flex w-full min-w-0 items-center justify-center
              rounded-md bg-white p-2
            "
          >
            <BarcodeSvg value={transaction.barcode_token} />
          </div>

          <p className="break-words text-center text-[9px] text-[#48645f]">
            Tunjukkan gelang saat diperlukan
          </p>

          <div className="border-t border-[#d9dfd4] pt-2">
            <p className="text-[9px] text-[#62736d]">
              Total transaksi
            </p>
            <p className="text-sm font-bold text-[#173c38]">
              {formatRupiah(transaction.total_amount)}
            </p>
            <p className="mt-1 text-[9px] text-[#62736d]">
              Pembayaran: {transaction.payment?.status_label ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Identitas transaksi: dipertahankan untuk pemeriksaan petugas */}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-[#dce4dc] bg-[#f4f3e9] px-4 py-2 print:px-3 print:py-1">
        <p className="min-w-0 break-all font-mono text-[9px] text-[#365b54]">
          {transaction.transaction_code}
        </p>
        <p className="text-[9px] text-[#526c65]">
          PANTAI PARANGTRITIS
        </p>
      </div>
    </article>
  );
}
