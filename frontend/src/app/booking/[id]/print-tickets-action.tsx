"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

/**
 * Mencatat aksi cetak ke backend (audit) lalu membuka halaman tiket. Backend
 * menolak cetak sebelum lunas dengan 422; cetak ulang hanya menambah audit.
 */
export default function PrintTicketsAction({
  bookingId,
}: {
  bookingId: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function printTickets() {
    setPending(true);
    setError(null);

    try {
      await apiRequest<{ message: string }>(
        `/api/bookings/${bookingId}/print`,
        {},
      );
      router.push(`/booking/${bookingId}/print`);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Terjadi kesalahan yang tidak terduga.",
      );
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={printTickets}
        disabled={pending}
        className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Menyiapkan…" : "Cetak tiket"}
      </button>
      {error ? (
        <p
          role="alert"
          className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
