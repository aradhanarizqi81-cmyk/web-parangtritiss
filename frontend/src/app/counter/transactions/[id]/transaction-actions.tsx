"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

/**
 * Aksi operasional loket: konfirmasi tunai dan cetak tiket.
 *
 * Backend tetap sumber kebenaran untuk status; tombol di sini hanya
 * menyesuaikan tampilan. Konfirmasi ganda dijawab backend dengan 409.
 */
export default function TransactionActions({
  transactionId,
  status,
}: {
  transactionId: number;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"confirm" | "print" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canConfirm = status === "pending";
  const canPrint = status === "paid" || status === "checked_in";

  async function confirmPayment() {
    setPending("confirm");
    setMessage(null);
    setError(null);

    try {
      await apiRequest(`/api/counter/transactions/${transactionId}/confirm-payment`, {});
      setMessage("Pembayaran tunai dikonfirmasi.");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Gagal mengonfirmasi pembayaran.",
      );
      // Muat ulang agar status terbaru dari backend ditampilkan.
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  async function printTickets() {
    setPending("print");
    setMessage(null);
    setError(null);

    try {
      await apiRequest(`/api/counter/transactions/${transactionId}/print`, {});
      router.push(`/counter/transactions/${transactionId}/print`);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Gagal mencatat pencetakan.",
      );
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {canConfirm ? (
          <button
            type="button"
            onClick={confirmPayment}
            disabled={pending !== null}
            className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {pending === "confirm"
              ? "Mengonfirmasi…"
              : "Konfirmasi pembayaran tunai"}
          </button>
        ) : null}

        {canPrint ? (
          <button
            type="button"
            onClick={printTickets}
            disabled={pending !== null}
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 font-medium text-neutral-800 hover:bg-neutral-100 disabled:opacity-60"
          >
            {pending === "print" ? "Menyiapkan…" : "Cetak tiket"}
          </button>
        ) : null}
      </div>

      {message ? (
        <p
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
        >
          {message}
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
