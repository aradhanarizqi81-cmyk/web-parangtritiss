"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Alert from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
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
    <div className="rounded-lg border border-info/25 bg-info-soft p-4">
      <h2 className="text-lg font-semibold">Simulasi pembayaran</h2>
      <p className="mt-1 text-sm text-info">
        Ini bukan gateway pembayaran sungguhan. Tombol di bawah hanya
        mensimulasikan hasil pembayaran untuk keperluan akademik.
      </p>

      <dl className="mt-3 text-xs text-info">
        <div className="flex gap-2">
          <dt className="font-medium">Referensi simulasi</dt>
          <dd className="break-all font-mono">{reference}</dd>
        </div>
      </dl>

      {message ? (
        <Alert tone="success" className="mt-3">
          {message}
        </Alert>
      ) : null}

      {error ? (
        <Alert tone="danger" className="mt-3">
          {error}
        </Alert>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => simulate("success")}
          disabled={pending !== null}
          className={buttonClasses({ size: "md" })}
        >
          {pending === "success" ? "Memproses…" : "Bayar sekarang"}
        </button>
        <button
          type="button"
          onClick={() => simulate("failure")}
          disabled={pending !== null}
          className={buttonClasses({ variant: "secondary", size: "md" })}
        >
          {pending === "failure" ? "Memproses…" : "Simulasikan gagal"}
        </button>
      </div>
    </div>
  );
}
