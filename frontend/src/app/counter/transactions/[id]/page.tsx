import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/counter/status-badge";
import TransactionActions from "./transaction-actions";
import { getCurrentUser } from "@/lib/auth/guard";
import { canUseCounter } from "@/lib/auth/roles";
import { formatRupiah } from "@/lib/pricing/tariffs";
import { fetchCounterTransaction } from "@/lib/counter/server";

export const instant = false;

function Denied() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Akses ditolak</h1>
      <p className="mt-2 text-sm text-muted">
        Anda tidak berhak melihat transaksi loket ini.
      </p>
      <Link
        href="/profile"
        className="mt-6 inline-block text-sm font-medium text-ocean hover:underline"
      >
        Kembali ke profil
      </Link>
    </section>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2 last:border-b-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

export default async function CounterTransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canUseCounter(user.role)) {
    return <Denied />;
  }

  const result = await fetchCounterTransaction(id);

  if (!result.ok) {
    if (result.kind === "unauthorized") redirect("/login");
    if (result.kind === "not_found") notFound();
    if (result.kind === "forbidden") return <Denied />;

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

  const transaction = result.data.data;

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {transaction.transaction_code}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {transaction.source_label} · kunjungan{" "}
            {transaction.visit_date ?? "—"}
          </p>
        </div>
        <StatusBadge
          status={transaction.status}
          label={transaction.status_label}
        />
      </div>

      <dl className="mt-6 rounded-lg border border-line bg-surface p-4">
        <DetailRow label="Kasir">
          {transaction.cashier?.name ?? "—"}
        </DetailRow>
        <DetailRow label="Jumlah pengunjung">
          {transaction.visitor_count}
        </DetailRow>
        <DetailRow label="Tagihan wisatawan">
          {transaction.visitor_count} ×{" "}
          {formatRupiah(transaction.visitor_unit_tariff)} ={" "}
          {formatRupiah(transaction.visitor_total)}
        </DetailRow>
        <DetailRow label="Tagihan kendaraan">
          {formatRupiah(transaction.vehicle_total)}
        </DetailRow>
        <DetailRow label="Total">
          <span className="font-semibold">
            {formatRupiah(transaction.total_amount)}
          </span>
        </DetailRow>
      </dl>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Pembayaran</h2>
        {transaction.payment ? (
          <dl className="mt-3 rounded-lg border border-line bg-surface p-4">
            <DetailRow label="Metode">
              {transaction.payment.method_label}
            </DetailRow>
            <DetailRow label="Status">
              <StatusBadge
                status={transaction.payment.status}
                label={transaction.payment.status_label}
              />
            </DetailRow>
            <DetailRow label="Nominal">
              {formatRupiah(transaction.payment.amount)}
            </DetailRow>
            <DetailRow label="Diterima oleh">
              {transaction.payment.received_by?.name ?? "—"}
            </DetailRow>
            <DetailRow label="Waktu konfirmasi">
              {transaction.payment.paid_at
                ? new Date(transaction.payment.paid_at).toLocaleString("id-ID")
                : "—"}
            </DetailRow>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Belum ada catatan pembayaran.
          </p>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Pengunjung</h2>
        <ul className="mt-3 space-y-2">
          {transaction.visitors.map((visitor, index) => (
            <li
              key={visitor.id}
              className="flex items-center justify-between rounded-md border border-line bg-surface px-3 py-2 text-sm"
            >
              <span className="text-foreground">
                {index + 1}. {visitor.full_name}
              </span>
              <span className="font-mono text-xs text-muted">
                {visitor.masked_nik}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Kendaraan</h2>
        {transaction.vehicles.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Tidak ada kendaraan pada transaksi ini.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {transaction.vehicles.map((vehicle) => (
              <li
                key={vehicle.vehicle_type_id}
                className="flex items-center justify-between rounded-md border border-line bg-surface px-3 py-2 text-sm"
              >
                <span className="text-foreground">
                  {vehicle.name} ({vehicle.quantity} ×{" "}
                  {formatRupiah(vehicle.unit_tariff)})
                </span>
                <span className="tabular-nums text-foreground">
                  {formatRupiah(vehicle.subtotal)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Tiket individual</h2>
        <ul className="mt-3 space-y-2">
          {transaction.tickets.map((ticket) => {
            const visitor = transaction.visitors.find(
              (candidate) => candidate.id === ticket.visitor_id,
            );

            return (
              <li
                key={ticket.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm"
              >
                <span className="font-mono text-foreground">
                  {ticket.ticket_code}
                </span>
                <span className="text-muted">{visitor?.full_name}</span>
                <span className="flex items-center gap-2">
                  {ticket.printed_at ? (
                    <span className="text-xs text-muted">
                      dicetak{" "}
                      {new Date(ticket.printed_at).toLocaleString("id-ID")}
                    </span>
                  ) : null}
                  <StatusBadge
                    status={ticket.status}
                    label={ticket.status_label}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-8">
        <TransactionActions
          transactionId={transaction.id}
          status={transaction.status}
        />
      </div>

      <div className="mt-8 flex gap-4 text-sm">
        <Link
          href="/counter"
          className="font-medium text-ocean hover:underline"
        >
          Transaksi baru
        </Link>
        <Link
          href="/profile"
          className="text-muted hover:underline"
        >
          Profil
        </Link>
      </div>
    </section>
  );
}
