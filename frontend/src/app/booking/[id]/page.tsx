import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/counter/status-badge";
import PaymentSimulation from "./payment-simulation";
import PrintTicketsAction from "./print-tickets-action";
import { getCurrentUser } from "@/lib/auth/guard";
import { canUseBooking } from "@/lib/auth/roles";
import { canPrintTickets, canSimulatePayment } from "@/lib/booking/status";
import { fetchBooking } from "@/lib/booking/server";
import { formatRupiah } from "@/lib/pricing/tariffs";

export const instant = false;

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-right text-neutral-900">{children}</dd>
    </div>
  );
}

export default async function BookingDetailPage({
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
        <p className="mt-2 text-sm text-neutral-600">
          Anda tidak berhak melihat booking ini.
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
        <Link
          href="/booking/history"
          className="mt-6 inline-block text-sm font-medium text-emerald-800 hover:underline"
        >
          Kembali ke riwayat booking
        </Link>
      </section>
    );
  }

  const booking = result.data.data;
  const isOwner = booking.owner?.id === user.id;
  const canPay = isOwner && canSimulatePayment(booking.status);
  const canPrint = canPrintTickets(booking.status);
  const reference = booking.payment?.simulation_reference ?? null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Booking online
          </p>
          <h1 className="font-mono text-xl font-semibold">
            {booking.transaction_code}
          </h1>
        </div>
        <StatusBadge status={booking.status} label={booking.status_label} />
      </div>

      {user.role === "admin" ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Mode admin: hanya membaca. Membayar atau mencetak atas nama wisatawan
          tidak tersedia bagi administrator.
        </p>
      ) : null}

      <dl className="mt-6 rounded-lg border border-neutral-200 bg-white p-4 text-sm">
        <DetailRow label="Tanggal kunjungan">
          {booking.visit_date ?? "—"}
        </DetailRow>
        <DetailRow label="Pemilik">
          {booking.owner?.name ?? "—"}
        </DetailRow>
        <DetailRow label="Jumlah wisatawan">{booking.visitor_count}</DetailRow>
        <DetailRow label="Tarif per wisatawan">
          {formatRupiah(booking.visitor_unit_tariff)}
        </DetailRow>
        <DetailRow label="Subtotal wisatawan">
          {formatRupiah(booking.visitor_total)}
        </DetailRow>
        <DetailRow label="Subtotal kendaraan">
          {formatRupiah(booking.vehicle_total)}
        </DetailRow>
        <DetailRow label="Total">
          <span className="font-semibold">
            {formatRupiah(booking.total_amount)}
          </span>
        </DetailRow>
      </dl>

      <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Pengunjung</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {booking.visitors.map((visitor) => (
            <li
              key={visitor.id}
              className="flex justify-between gap-4 rounded-md border border-neutral-100 px-3 py-2"
            >
              <span>{visitor.full_name}</span>
              <span className="font-mono text-xs text-neutral-600">
                {visitor.masked_nik}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {booking.vehicles.length > 0 ? (
        <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Kendaraan</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {booking.vehicles.map((vehicle) => (
              <li
                key={vehicle.vehicle_type_id}
                className="flex justify-between gap-4"
              >
                <span>
                  {vehicle.name ?? "Kendaraan"} ({vehicle.quantity} ×{" "}
                  {formatRupiah(vehicle.unit_tariff)})
                </span>
                <span className="tabular-nums">
                  {formatRupiah(vehicle.subtotal)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Pembayaran</h2>
        {booking.payment ? (
          <dl className="mt-3 text-sm">
            <DetailRow label="Metode">
              {booking.payment.method_label}
            </DetailRow>
            <DetailRow label="Status">
              <StatusBadge
                status={booking.payment.status}
                label={booking.payment.status_label}
              />
            </DetailRow>
            <DetailRow label="Jumlah">
              {formatRupiah(booking.payment.amount)}
            </DetailRow>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-neutral-500">
            Belum ada catatan pembayaran.
          </p>
        )}
      </section>

      {canPay && reference ? (
        <div className="mt-6">
          <PaymentSimulation bookingId={booking.id} reference={reference} />
        </div>
      ) : null}

      {isOwner && booking.status === "pending" && !reference ? (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Referensi simulasi tidak tersedia. Hubungi administrator.
        </p>
      ) : null}

      <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Tiket</h2>
          {canPrint ? <PrintTicketsAction bookingId={booking.id} /> : null}
        </div>

        {booking.tickets.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">
            Tiket diterbitkan otomatis setelah pembayaran berhasil.
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {booking.tickets.map((ticket) => (
              <li
                key={ticket.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-100 px-3 py-2"
              >
                <span className="font-mono text-xs">{ticket.ticket_code}</span>
                <StatusBadge
                  status={ticket.status}
                  label={ticket.status_label}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-6">
        <Link
          href="/booking/history"
          className="text-sm font-medium text-emerald-800 hover:underline"
        >
          Kembali ke riwayat booking
        </Link>
      </div>
    </section>
  );
}
