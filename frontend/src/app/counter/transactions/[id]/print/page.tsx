import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import PrintButton from "@/components/counter/print-button";
import AccessDenied from "@/components/ui/access-denied";
import Alert from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import PageHeader from "@/components/ui/page-header";
import WristbandCard from "@/components/counter/wristband-card";
import { getCurrentUser } from "@/lib/auth/guard";
import { canUseCounter } from "@/lib/auth/roles";
import { fetchCounterTransaction } from "@/lib/counter/server";

export const instant = false;

export default async function CounterTicketPrintPage({
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
      <AccessDenied description="Anda tidak berhak mencetak tiket transaksi ini." />
    );
  }

  const result = await fetchCounterTransaction(id);

  if (!result.ok) {
    if (result.kind === "unauthorized") redirect("/login");
    if (result.kind === "not_found") notFound();

    return (
      <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Alert tone="danger">{result.message}</Alert>
      </section>
    );
  }

  const transaction = result.data.data;
  const printable =
    transaction.status === "paid" || transaction.status === "checked_in";

  if (!printable) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Loket tiket"
          title="Tiket belum dapat dicetak"
          description={`Konfirmasi pembayaran tunai terlebih dahulu. Status saat ini: ${transaction.status_label}.`}
        />
        <Link
          href={`/counter/transactions/${transaction.id}`}
          className={buttonClasses({
            variant: "secondary",
            size: "md",
            className: "mt-6",
          })}
        >
          Kembali ke detail transaksi
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0">
      <PageHeader
        className="print:hidden"
        eyebrow="Loket tiket"
        title="Cetak tiket"
        description={`${transaction.transaction_code} · ${transaction.tickets.length} tiket`}
        actions={<PrintButton />}
      />

      <Alert tone="warning" className="mt-6 print:hidden">
        Halaman ini hanya merender gelang untuk dicetak lewat browser. Backend
        sudah mencatat aksi cetak; cetak fisik tetap bergantung pada printer dan
        pengaturan browser. Ukuran media gelang belum diverifikasi pada
        perangkat nyata, jadi periksa pratinjau cetak sebelum mencetak massal.
      </Alert>

      <div className="mt-6 space-y-4 print:mt-0 print:space-y-3">
        {transaction.tickets.map((ticket) => (
          <WristbandCard
            key={ticket.id}
            transaction={transaction}
            ticket={ticket}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted print:hidden">
        Pada layar sempit, geser gelang ke samping untuk melihat semua detail.
      </p>
    </section>
  );
}
