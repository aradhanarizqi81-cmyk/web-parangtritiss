"use client";

import { useState } from "react";

/**
 * Mengekstrak nama berkas dari header Content-Disposition (RFC 6266 sederhana).
 * Berfungsi sebagai nama unduhan; bila tidak ada, jatuh ke "laporan.csv".
 */
function filenameFromDisposition(value: string | null): string {
  if (!value) return "laporan.csv";

  const star = /filename\*=UTF-8''([^;]+)/i.exec(value);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      /* lanjut ke fallback */
    }
  }

  const plain = /filename="?([^";]+)"?/i.exec(value);
  return plain?.[1] ?? "laporan.csv";
}

/**
 * Tombol unduh CSV. Alih-alih navigasi biasa (yang akan menampilkan JSON error
 * mentah dan menghapus state halaman bila sesi habis), tombol ini mengambil
 * berkas lewat fetch: sukses → unduh programatik; gagal → tampilkan pesan
 * error secara inline tanpa meninggalkan laporan.
 */
export default function ExportLink({ href }: { href: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDownload() {
    if (pending) return;

    setPending(true);
    setError(null);

    try {
      const response = await fetch(href, { credentials: "same-origin" });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        setError(
          payload?.message ?? "Gagal mengunduh CSV. Silakan coba lagi.",
        );
        return;
      }

      const disposition = response.headers.get("Content-Disposition");
      const filename = filenameFromDisposition(disposition);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Tidak dapat menghubungi server. Periksa koneksi Anda.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={onDownload}
        disabled={pending}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-medium text-ocean transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Menyiapkan…" : "Unduh CSV"}
      </button>

      {error ? (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
