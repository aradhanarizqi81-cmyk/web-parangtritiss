import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import WristbandCard from "@/components/counter/wristband-card";
import AccessDenied from "@/components/ui/access-denied";
import Alert from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import PageHeader from "@/components/ui/page-header";
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
      <AccessDenied description="Anda tidak berhak mencetak tiket booking ini." />
    );
  }

  const result = await fetchBooking(id);

  if (!result.ok) {
    if (result.kind === "unauthorized") redirect("/login");
    if (result.kind === "not_found") notFound();

    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <Alert tone="danger">{result.message}</Alert>
      </section>
    );
  }

  const booking = result.data.data;

  if (!canPrintTickets(booking.status) || booking.tickets.length === 0) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <PageHeader
          eyebrow="Booking online"
          title="Tiket belum dapat dicetak"
          description={`Selesaikan simulasi pembayaran terlebih dahulu. Status saat ini: ${booking.status_label}.`}
        />
        <Link
          href={`/booking/${booking.id}`}
          className={buttonClasses({
            variant: "secondary",
            size: "md",
            className: "mt-6",
          })}
        >
          Kembali ke detail booking
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <PageHeader
        className="print:hidden"
        eyebrow="Booking online"
        title="Pratinjau & Cetak Tiket"
        description={`${booking.transaction_code} · ${booking.tickets.length} tiket`}
        actions={
          <>
            <Link
              href={`/booking/${booking.id}`}
              className={buttonClasses({ variant: "secondary", size: "md" })}
            >
              Kembali ke Booking
            </Link>
            <PrintTicketButton bookingId={booking.id} />
          </>
        }
      />

      <Alert tone="warning" className="mt-6 print:hidden">
        Ini halaman pratinjau gelang. Aksi cetak dicatat backend saat Anda
        menekan tombol Cetak Tiket, bukan saat halaman ini dibuka. Menekan
        tombol tidak menjamin gelang tercetak secara fisik; hasil cetak tetap
        bergantung pada printer dan pengaturan browser. Ukuran media gelang
        belum diverifikasi pada perangkat nyata.
      </Alert>

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
