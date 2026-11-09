import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/counter/status-badge";
import TransactionActions from "./transaction-actions";
import AccessDenied from "@/components/ui/access-denied";
import Alert from "@/components/ui/alert";
import Card from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth/guard";
import { canUseCounter } from "@/lib/auth/roles";
import { formatRupiah } from "@/lib/pricing/tariffs";
import { fetchCounterTransaction } from "@/lib/counter/server";

export const instant = false;

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
    return (
      <AccessDenied description="Anda tidak berhak melihat transaksi loket ini." />
    );
  }

  const result = await fetchCounterTransaction(id);

  if (!result.ok) {
    if (result.kind === "unauthorized") redirect("/login");
    if (result.kind === "not_found") notFound();
    if (result.kind === "forbidden") {
      return (
        <AccessDenied description="Anda tidak berhak melihat transaksi loket ini." />
      );
    }

    return (
      <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Alert tone="danger">{result.message}</Alert>
      </section>
    );
  }

  const transaction = result.data.data;

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={transaction.source_label}
        title={transaction.transaction_code}
        titleClassName="font-mono text-xl sm:text-2xl"
        description={`Kunjungan ${transaction.visit_date ?? "—"}`}
        actions={
          <StatusBadge
            status={transaction.status}
            label={transaction.status_label}
          />
        }
      />

      <Card className="mt-6">
        <dl>
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
      </Card>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Pembayaran</h2>
        {transaction.payment ? (
          <Card className="mt-3">
            <dl>
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
          </Card>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Belum ada catatan pembayaran.
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Pengunjung</h2>
        <Card className="mt-3">
          <ul className="divide-y divide-line">
            {transaction.visitors.map((visitor, index) => (
              <li
                key={visitor.id}
                className="flex items-center justify-between gap-4 py-2 text-sm first:pt-0 last:pb-0"
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
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Kendaraan</h2>
        {transaction.vehicles.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Tidak ada kendaraan pada transaksi ini.
          </p>
        ) : (
          <Card className="mt-3">
            <ul className="divide-y divide-line">
              {transaction.vehicles.map((vehicle) => (
                <li
                  key={vehicle.vehicle_type_id}
                  className="flex items-center justify-between gap-4 py-2 text-sm first:pt-0 last:pb-0"
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
          </Card>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Tiket individual</h2>
        <Card className="mt-3">
          <ul className="divide-y divide-line">
            {transaction.tickets.map((ticket) => {
              const visitor = transaction.visitors.find(
                (candidate) => candidate.id === ticket.visitor_id,
              );

              return (
                <li
                  key={ticket.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm first:pt-0 last:pb-0"
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
        </Card>
      </section>

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
        <Link href="/profile" className="text-muted hover:underline">
          Profil
        </Link>
      </div>
    </section>
  );
}
