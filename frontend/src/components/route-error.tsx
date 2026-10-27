"use client";

import Link from "next/link";

/**
 * Batas error umum untuk error.tsx. Menampilkan pesan ramah plus tombol coba
 * lagi (memakai `retry` yang disediakan Next.js 16 untuk memuat ulang segmen)
 * dan jalan pulang yang aman, alih-alih halaman error bawaan tanpa navigasi.
 */
export default function RouteError({
  retry,
  title = "Terjadi kesalahan",
  description = "Data gagal dimuat. Coba muat ulang, atau kembali beberapa saat lagi.",
  homeHref = "/",
  homeLabel = "Kembali ke beranda",
}: {
  retry?: () => void;
  title?: string;
  description?: string;
  homeHref?: string;
  homeLabel?: string;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 p-6 text-center"
    >
      <h2 className="text-lg font-semibold text-red-900">{title}</h2>
      <p className="mt-2 text-sm text-red-700">{description}</p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {retry ? (
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-ocean px-5 py-2 text-sm font-semibold text-ivory transition-colors hover:bg-ocean-dark"
          >
            Coba lagi
          </button>
        ) : null}

        <Link
          href={homeHref}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-surface px-5 py-2 text-sm font-medium text-ocean transition hover:bg-surface-soft"
        >
          {homeLabel}
        </Link>
      </div>
    </div>
  );
}
