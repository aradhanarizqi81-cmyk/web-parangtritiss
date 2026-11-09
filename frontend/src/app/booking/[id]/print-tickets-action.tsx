"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Alert from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
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
        className={buttonClasses({ size: "md" })}
      >
        {pending ? "Menyiapkan…" : "Cetak Tiket"}
      </button>
      {error ? (
        <Alert tone="danger" className="mt-2">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}
