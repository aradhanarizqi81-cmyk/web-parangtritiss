import { redirect } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/counter/status-badge";
import AccessDenied from "@/components/ui/access-denied";
import Alert from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import Card from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth/guard";
import { canUseBooking } from "@/lib/auth/roles";
import { fetchBookings } from "@/lib/booking/server";
import { formatRupiah } from "@/lib/pricing/tariffs";

export const instant = false;

export default async function BookingHistoryPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canUseBooking(user.role)) {
    return <AccessDenied description="Anda tidak berhak melihat riwayat booking." />;
  }

  const result = await fetchBookings();

  if (!result.ok) {
    if (result.kind === "unauthorized") redirect("/login");

    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <Alert tone="danger">{result.message}</Alert>
      </section>
    );
  }

  const bookings = result.data.data;
  const isAdmin = user.role === "admin";

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader
        eyebrow="Booking online"
        title="Riwayat booking"
        description={
          isAdmin
            ? "Semua booking online terbaru (maksimal 50)."
            : "Booking online milik Anda, terbaru lebih dahulu (maksimal 50)."
        }
        actions={
          isAdmin ? undefined : (
            <Link href="/booking" className={buttonClasses({ size: "md" })}>
              Booking baru
            </Link>
          )
        }
      />

      {bookings.length === 0 ? (
        <Card className="mt-8">
          <p className="text-sm text-muted">Belum ada booking.</p>
        </Card>
      ) : (
        <ul className="mt-8 space-y-3">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <Link href={`/booking/${booking.id}`} className="block">
                <Card className="flex flex-wrap items-center justify-between gap-3 transition-colors hover:border-ocean/40 hover:shadow-raised">
                  <div>
                    <p className="font-mono text-sm font-semibold">
                      {booking.transaction_code}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Kunjungan {booking.visit_date ?? "—"} ·{" "}
                      {booking.visitor_count} wisatawan
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge
                      status={booking.status}
                      label={booking.status_label}
                    />
                    <span className="tabular-nums text-sm font-medium">
                      {formatRupiah(booking.total_amount)}
                    </span>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
