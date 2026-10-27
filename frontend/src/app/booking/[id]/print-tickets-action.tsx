"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

/**
 * Tombol cetak pada halaman pratinjau tiket.
 *
 * Pencatatan aksi cetak ke backend (audit + status tiket) terjadi SAAT tombol
 * ini ditekan, bukan saat halaman pratinjau dibuka. Bila pencatatan gagal,
 * dialog cetak tidak dibuka dan pesan galat ditampilkan; backend tetap sumber
 * kebenaran (422 bila belum lunas, 403 bila bukan pemilik, 401 bila sesi
 * habis). Berhasilnya pencatatan tidak membuktikan tiket tercetak secara fisik.
 */
export default function PrintTicketButton({
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
      // Baru buka dialog cetak setelah backend mencatat aksi cetak.
      window.print();
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Terjadi kesalahan yang tidak terduga.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="print:hidden">
      <button
        type="button"
        onClick={printTickets}
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-ocean px-5 py-2 font-semibold text-ivory transition-colors hover:bg-ocean-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Menyiapkan…" : "Cetak Tiket"}
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
