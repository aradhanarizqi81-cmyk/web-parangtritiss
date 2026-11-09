"use client";

import Link from "next/link";
import Alert from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";

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
    <Alert tone="danger" className="p-6 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm">{description}</p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {retry ? (
          <button
            type="button"
            onClick={() => retry()}
            className={buttonClasses({ size: "md" })}
          >
            Coba lagi
          </button>
        ) : null}

        <Link
          href={homeHref}
          className={buttonClasses({ variant: "secondary", size: "md" })}
        >
          {homeLabel}
        </Link>
      </div>
    </Alert>
  );
}
