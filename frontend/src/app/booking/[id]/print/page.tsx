import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import WristbandCard from "@/components/counter/wristband-card";
import PrintTicketButton from "../print-tickets-action";
import { getCurrentUser } from "@/lib/auth/guard";
import { canUseBooking } from "@/lib/auth/roles";
import { canPrintTickets } from "@/lib/booking/status";
import { fetchBooking } from "@/lib/booking/server";

export const instant = false;

export default async function BookingTicketPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canUseBooking(user.role)) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-semibold">Akses ditolak</h1>
        <p className="mt-2 text-sm text-muted">
          Anda tidak berhak mencetak tiket booking ini.
        </p>
      </section>
    );
  }

  const result = await fetchBooking(id);

  if (!result.ok) {
    if (result.kind === "unauthorized") redirect("/login");
    if (result.kind === "not_found") notFound();

    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {result.message}
        </p>
      </section>
    );
  }

  const booking = result.data.data;

  if (!canPrintTickets(booking.status) || booking.tickets.length === 0) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-semibold">Tiket belum dapat dicetak</h1>
        <p className="mt-2 text-sm text-muted">
          Selesaikan simulasi pembayaran terlebih dahulu. Status saat ini:{" "}
          {booking.status_label}.
        </p>
        <Link
          href={`/booking/${booking.id}`}
          className="mt-6 inline-block text-sm font-medium text-ocean hover:underline"
        >
          Kembali ke detail booking
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">Pratinjau &amp; Cetak Tiket</h1>
          <p className="mt-1 text-sm text-muted">
            {booking.transaction_code} · {booking.tickets.length} tiket
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/booking/${booking.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-surface px-5 py-2 font-semibold text-foreground transition-colors hover:bg-surface-soft"
          >
            Kembali ke Booking
          </Link>
          <PrintTicketButton bookingId={booking.id} />
        </div>
      </div>

      <p className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 print:hidden">
        Ini halaman pratinjau gelang. Aksi cetak dicatat backend saat Anda
        menekan tombol Cetak Tiket, bukan saat halaman ini dibuka. Menekan
        tombol tidak menjamin gelang tercetak secara fisik; hasil cetak tetap
        bergantung pada printer dan pengaturan browser. Ukuran media gelang
        belum diverifikasi pada perangkat nyata.
      </p>

      <div className="mt-6 space-y-4 print:mt-0 print:space-y-3">
        {booking.tickets.map((ticket) => (
          <WristbandCard key={ticket.id} transaction={booking} ticket={ticket} />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted print:hidden">
        Pada layar sempit, geser gelang ke samping untuk melihat semua detail.
      </p>
    </section>
  );
}
