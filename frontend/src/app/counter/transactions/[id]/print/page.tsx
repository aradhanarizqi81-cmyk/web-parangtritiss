import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import PrintButton from "@/components/counter/print-button";
import TicketCard from "@/components/counter/ticket-card";
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
      <section className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-semibold">Akses ditolak</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Anda tidak berhak mencetak tiket transaksi ini.
        </p>
      </section>
    );
  }

  const result = await fetchCounterTransaction(id);

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

  const transaction = result.data.data;
  const printable =
    transaction.status === "paid" || transaction.status === "checked_in";

  if (!printable) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-semibold">Tiket belum dapat dicetak</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Konfirmasi pembayaran tunai terlebih dahulu. Status saat ini:{" "}
          {transaction.status_label}.
        </p>
        <Link
          href={`/counter/transactions/${transaction.id}`}
          className="mt-6 inline-block text-sm font-medium text-emerald-800 hover:underline"
        >
          Kembali ke detail transaksi
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">Cetak tiket</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {transaction.transaction_code} · {transaction.tickets.length} tiket
          </p>
        </div>
        <PrintButton />
      </div>

      <p className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 print:hidden">
        Halaman ini hanya merender tiket untuk dicetak lewat browser. Backend
        sudah mencatat aksi cetak; cetak fisik tetap bergantung pada printer dan
        pengaturan browser.
      </p>

      <div className="mt-6 space-y-4 print:mt-0 print:space-y-3">
        {transaction.tickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            transaction={transaction}
            ticket={ticket}
          />
        ))}
      </div>
    </section>
  );
}
