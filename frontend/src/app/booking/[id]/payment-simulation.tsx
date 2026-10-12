"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

/**
 * Simulasi pembayaran akademik untuk booking online.
 *
 * Tombol di sini hanya mengirim skenario (sukses/gagal) dan referensi yang
 * diterbitkan server. Backend tetap memutuskan status akhirnya; simulasi ulang
 * setelah lunas dijawab 409.
 */
export default function PaymentSimulation({
  bookingId,
  reference,
}: {
  bookingId: number;
  reference: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"success" | "failure" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function simulate(outcome: "success" | "failure") {
    setPending(outcome);
    setMessage(null);
    setError(null);

    try {
      await apiRequest<{ message: string }>(
        `/api/bookings/${bookingId}/simulate-payment`,
        { outcome, reference },
      );

      setMessage(
        outcome === "success"
          ? "Pembayaran simulasi berhasil. Tiket sudah diterbitkan."
          : "Simulasi kegagalan dicatat. Anda dapat mencoba lagi.",
      );
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setError(caught.message);
        router.refresh();
      } else {
        setError(
          caught instanceof ApiError
            ? caught.message
            : "Terjadi kesalahan yang tidak terduga.",
        );
      }
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
      <h2 className="text-lg font-semibold">Simulasi pembayaran</h2>
      <p className="mt-1 text-sm text-sky-900">
        Ini bukan gateway pembayaran sungguhan. Tombol di bawah hanya
        mensimulasikan hasil pembayaran untuk keperluan akademik.
      </p>

      <dl className="mt-3 text-xs text-sky-900">
        <div className="flex gap-2">
          <dt className="font-medium">Referensi simulasi</dt>
          <dd className="break-all font-mono">{reference}</dd>
        </div>
      </dl>

      {message ? (
        <p
          role="status"
          className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
        >
          {message}
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => simulate("success")}
          disabled={pending !== null}
          className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {pending === "success" ? "Memproses…" : "Bayar sekarang"}
        </button>
        <button
          type="button"
          onClick={() => simulate("failure")}
          disabled={pending !== null}
          className="rounded-md border border-neutral-300 px-4 py-2 font-medium text-neutral-700 hover:bg-white disabled:opacity-60"
        >
          {pending === "failure" ? "Memproses…" : "Simulasikan gagal"}
        </button>
      </div>
    </div>
  );
}
