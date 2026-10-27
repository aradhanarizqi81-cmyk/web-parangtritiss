import { redirect } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/counter/status-badge";
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
    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-semibold">Akses ditolak</h1>
        <p className="mt-2 text-sm text-muted">
          Anda tidak berhak melihat riwayat booking.
        </p>
      </section>
    );
  }

  const result = await fetchBookings();

  if (!result.ok) {
    if (result.kind === "unauthorized") redirect("/login");

    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {result.message}
        </p>
      </section>
    );
  }

  const bookings = result.data.data;
  const isAdmin = user.role === "admin";

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Riwayat booking</h1>
          <p className="mt-2 text-sm text-muted">
            {isAdmin
              ? "Semua booking online terbaru (maksimal 50)."
              : "Booking online milik Anda, terbaru lebih dahulu (maksimal 50)."}
          </p>
        </div>
        {isAdmin ? null : (
          <Link
            href="/booking"
            className="text-sm font-medium text-ocean hover:underline"
          >
            Booking baru
          </Link>
        )}
      </div>

      {bookings.length === 0 ? (
        <p className="mt-8 rounded-md border border-line bg-surface px-4 py-6 text-sm text-muted">
          Belum ada booking.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <Link
                href={`/booking/${booking.id}`}
                className="block rounded-lg border border-line bg-surface p-4 hover:border-ocean/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
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
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
