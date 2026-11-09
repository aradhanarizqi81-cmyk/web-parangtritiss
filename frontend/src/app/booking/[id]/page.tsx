import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import BarcodeSvg from "@/components/barcode-svg";
import StatusBadge from "@/components/counter/status-badge";
import AccessDenied from "@/components/ui/access-denied";
import Alert from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import Card from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import PaymentSimulation from "./payment-simulation";
import { getCurrentUser } from "@/lib/auth/guard";
import { canUseBooking } from "@/lib/auth/roles";
import {
  canPrintTickets,
  canShowRedemptionCode,
  canSimulatePayment,
} from "@/lib/booking/status";
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
    <div className="flex justify-between gap-4 border-b border-line py-2 last:border-b-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-right text-sm text-foreground">{children}</dd>
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
    return <AccessDenied description="Anda tidak berhak melihat booking ini." />;
  }

  const result = await fetchBooking(id);

  if (!result.ok) {
    if (result.kind === "unauthorized") redirect("/login");
    if (result.kind === "not_found") notFound();

    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <Alert tone="danger">{result.message}</Alert>
        <Link
          href="/booking/history"
          className="mt-6 inline-block text-sm font-medium text-ocean hover:underline"
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
  const paymentSucceeded = booking.payment?.status === "success";
  const redemptionToken = booking.redemption.token;
  const showRedemptionCode = canShowRedemptionCode(redemptionToken);

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader
        eyebrow="Booking online"
        title={booking.transaction_code}
        titleClassName="font-mono text-xl sm:text-2xl"
        actions={
          <StatusBadge status={booking.status} label={booking.status_label} />
        }
      />

      {paymentSucceeded ? (
        <Alert tone="success" className="mt-4">
          Pembayaran berhasil. Kode penukaran di bawah dipakai untuk mengambil
          tiket fisik (gelang) di loket.
        </Alert>
      ) : null}

      {user.role === "admin" ? (
        <Alert tone="warning" className="mt-4">
          Mode admin: hanya membaca. Membayar atas nama wisatawan tidak
          tersedia bagi administrator.
        </Alert>
      ) : null}

      <Card className="mt-6">
        <dl>
          <DetailRow label="Tanggal kunjungan">
            {booking.visit_date ?? "—"}
          </DetailRow>
          <DetailRow label="Pemilik">{booking.owner?.name ?? "—"}</DetailRow>
          <DetailRow label="Jumlah wisatawan">
            {booking.visitor_count}
          </DetailRow>
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
      </Card>

      <Card className="mt-6">
        <h2 className="text-lg font-semibold">Pengunjung</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {booking.visitors.map((visitor) => (
            <li
              key={visitor.id}
              className="flex justify-between gap-4 py-2 first:pt-0 last:pb-0"
            >
              <span>{visitor.full_name}</span>
              <span className="font-mono text-xs text-muted">
                {visitor.masked_nik}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {booking.vehicles.length > 0 ? (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold">Kendaraan</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {booking.vehicles.map((vehicle) => (
              <li
                key={vehicle.vehicle_type_id}
                className="flex justify-between gap-4 py-2 first:pt-0 last:pb-0"
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
        </Card>
      ) : null}

      <Card className="mt-6">
        <h2 className="text-lg font-semibold">Pembayaran</h2>
        {booking.payment ? (
          <dl className="mt-3">
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
          <p className="mt-3 text-sm text-muted">
            Belum ada catatan pembayaran.
          </p>
        )}
      </Card>

      {showRedemptionCode && redemptionToken ? (
        <Card className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Kode penukaran loket</h2>
            <StatusBadge
              status={booking.redemption.redeemed ? "used" : "pending"}
              label={booking.redemption.status_label}
            />
          </div>

          <p className="mt-2 text-sm text-muted">
            Kode ini hanya untuk mengambil tiket fisik (gelang) di loket. Bukan
            untuk masuk gerbang — barcode gerbang tercetak terpisah di gelang.
          </p>

          <div className="mt-4 rounded-lg border border-line bg-white p-3">
            <BarcodeSvg value={redemptionToken} height={72} />
            <p className="mt-2 break-all text-center font-mono text-xs text-muted">
              {redemptionToken}
            </p>
          </div>

          {booking.redemption.redeemed ? (
            <p className="mt-3 text-xs text-muted">
              Penukaran sudah dicatat di loket.
              {booking.redemption.redeemed_at
                ? " Anda tetap dapat melihat pratinjau tiket kapan saja."
                : ""}
            </p>
          ) : null}
        </Card>
      ) : null}

      {canPay && reference ? (
        <div className="mt-6">
          <PaymentSimulation bookingId={booking.id} reference={reference} />
        </div>
      ) : null}

      {isOwner && booking.status === "pending" && !reference ? (
        <Alert tone="danger" className="mt-6">
          Referensi simulasi tidak tersedia. Hubungi administrator.
        </Alert>
      ) : null}

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Tiket</h2>
          {canPrint && booking.tickets.length > 0 ? (
            <Link
              href={`/booking/${booking.id}/print`}
              className={buttonClasses({ size: "md" })}
            >
              Lihat Pratinjau Tiket
            </Link>
          ) : null}
        </div>

        <p className="mt-2 text-sm text-muted">
          Pratinjau menampilkan desain gelang dan barcode kode tiket
          individual. Kode penukaran di atas hanya untuk mengambil tiket fisik
          di loket.
        </p>

        {booking.tickets.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Tiket diterbitkan otomatis setelah pembayaran berhasil.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line text-sm">
            {booking.tickets.map((ticket) => (
              <li
                key={ticket.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
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
      </Card>

      <div className="mt-6">
        <Link
          href="/booking/history"
          className="text-sm font-medium text-ocean hover:underline"
        >
          Kembali ke riwayat booking
        </Link>
      </div>
    </section>
  );
}
