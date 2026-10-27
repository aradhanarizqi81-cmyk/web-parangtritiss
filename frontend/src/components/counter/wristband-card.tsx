import TicketBarcodeSvg from "@/components/counter/ticket-barcode-svg";
import type { PrintableTicket, PrintableTransaction } from "./ticket-card";

/**
 * Gelang tiket fisik Pantai Parangtritis.
 *
 * Komposisi mengikuti referensi "Tiket Gelang Pantai Parangtritis": pita datar
 * sangat memanjang (rasio ±8,4:1) berisi enam zona — tab kunci, panel brand
 * hijau laut, panel ivory kode+barcode, panel ivory tanggal, panel hijau
 * berornamen ombak, dan tab kunci berlubang. Ukuran zona, warna, serta aturan
 * cetak (`@page`, mm/pt) ada di `app/print.css`; komponen ini hanya menyusun
 * struktur dan isinya.
 *
 * Satu gelang mewakili satu `Ticket`. Barcode mengodekan kode tiket individual
 * yang sudah tersimpan; token loket dan barcode check-in gerbang tidak dicetak
 * di sini. Tidak ada token yang dibuat saat render. Hak penukaran fasilitas
 * belum tersedia di backend.
 */

const MONTHS_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/**
 * `visit_date` datang sebagai `YYYY-MM-DD` (kadang dengan jam). Diformat manual
 * agar hasil server dan klien identik dan tidak bergeser zona waktu.
 */
function formatVisitDate(value: string | null): string {
  if (!value) return "—";

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;

  const [, year, month, day] = match;
  const monthLabel = MONTHS_ID[Number(month) - 1];
  if (!monthLabel) return value;

  return `${Number(day)} ${monthLabel} ${year}`;
}

export default function WristbandCard({
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
    <div className="wristband-scroll">
      <article className="wristband">
        {/* Tab kunci: pasak bulat di ujung kiri gelang. */}
        <div className="wristband-tab wristband-tab-left" aria-hidden="true">
          <span className="wristband-peg" />
        </div>

        {/* Panel brand: nama pantai dominan, identitas pesisir, ornamen ombak. */}
        <div className="wristband-brand">
          <svg
            className="wristband-brand-sun"
            viewBox="0 0 72 30"
            aria-hidden="true"
          >
            <circle
              cx="56"
              cy="13"
              r="7.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M4 14q5-6 10 0 5-6 10 0M10 24q4-5 8 0 4-5 8 0M30 7q3.5-4.5 7 0 3.5-4.5 7 0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>

          <div className="wristband-brand-text">
            <h2 className="wristband-brand-title">Pantai Parangtritis</h2>
            <p className="wristband-brand-sub">Yogyakarta</p>
          </div>

          <svg
            className="wristband-brand-wave"
            viewBox="0 0 240 24"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0 8C30 1 60 15 90 9S150 1 180 9s50 7 60 0"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.8"
              strokeLinecap="round"
              opacity="0.85"
            />
            <path
              d="M0 11C30 3 60 19 90 13S150 3 180 13s50 8 60 0v11H0Z"
              fill="currentColor"
            />
            <path
              d="M0 17c30-8 60 6 90 0s60-8 90 0 50 7 60 0v7H0Z"
              fill="#ffffff"
              opacity="0.4"
            />
          </svg>
        </div>

        {/* Panel identitas: kode tiket individual dan barcode yang stabil. */}
        <div className="wristband-code">
          <p className="wristband-code-label">Tiket Individual</p>
          <p className="wristband-code-value">{ticket.ticket_code}</p>

          <div className="wristband-barcode">
            <TicketBarcodeSvg value={ticket.ticket_code} />
          </div>

          <p className="wristband-code-repeat">Kode tiket</p>
        </div>

        {/* Panel tanggal: kunjungan, ornamen ombak kecil, salam, nama pemegang. */}
        <div className="wristband-date">
          <p className="wristband-date-value">
            {formatVisitDate(transaction.visit_date)}
          </p>

          <svg
            className="wristband-date-wave"
            viewBox="0 0 24 12"
            aria-hidden="true"
          >
            <path
              d="M0 8q3-5 6 0t6 0 6 0 6 0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M0 11.4q3-4 6 0t6 0 6 0 6 0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.5"
            />
          </svg>

          <p className="wristband-date-greeting">Selamat Berwisata</p>

          {visitor ? (
            <p className="wristband-date-name">{visitor.full_name}</p>
          ) : null}
        </div>

        {/* Panel ivory bertabur ombak toska, tanpa informasi tambahan. */}
        <div className="wristband-ornament" aria-hidden="true">
          <svg
            className="wristband-ornament-svg"
            viewBox="0 0 40 48"
            preserveAspectRatio="none"
          >
            {[8, 18, 28, 38].map((y) => (
              <path
                key={y}
                d={`M0 ${y}q5-5 10 0t10 0 10 0 10 0`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                opacity="0.55"
              />
            ))}
          </svg>
        </div>

        {/* Tab kunci: panduan lubang oval di ujung kanan gelang. */}
        <div className="wristband-tab wristband-tab-right" aria-hidden="true">
          <span className="wristband-hole" />
        </div>
      </article>
    </div>
  );
}
