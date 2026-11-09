import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Kerangka tunggal untuk semua halaman auth: /login, /register, /staff/login.
 *
 * Props:
 *  - videoSrc: path file video di public/videos (mis. /videos/video3.mp4)
 *  - poster: path file poster lokal di public/images (bukan URL eksternal)
 *  - overlayClass: kelas Tailwind untuk gradien overlay latar
 *  - showEditorial: tampilkan panel editorial kiri (default true, hanya /login)
 *  - staffMode: mode petugas (badge AKSES PEGAWAI, overlay lebih gelap)
 *  - brandLabel: label kecil di bawah logo
 *  - children: isi form (dikontrol oleh halaman pemanggil)
 */
export default function AuthShell({
  videoSrc = "/videos/video3.mp4",
  poster = "/images/auth-poster.jpg",
  overlayClass = "from-teal-950/50 via-teal-900/30 to-teal-800/15",
  showEditorial = true,
  staffMode = false,
  brandLabel,
  children,
}: {
  videoSrc?: string;
  poster?: string;
  overlayClass?: string;
  showEditorial?: boolean;
  staffMode?: boolean;
  brandLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="relative isolate flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
      {/* Video background hero, loop otomatis. */}
      <video
        src={videoSrc}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />

      {/* Overlay gradien teal gelap sedang agar video tetap terlihat. */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 -z-10 bg-gradient-to-br ${overlayClass}`}
      />

      <div className="mx-auto w-full max-w-6xl items-center gap-12 lg:flex lg:gap-20">
        {/* Panel editorial kiri (hanya /login). */}
        {showEditorial && (
          <div className="hidden max-w-xl text-white lg:block">
            <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-sand">
              <span className="h-px w-10 bg-sand" />
              Bantul, Yogyakarta
            </p>

            <p className="mt-6 font-raleway text-[36px] font-light leading-[1.15] text-white sm:text-[46px] lg:text-[56px]">
              Temukan
              <br />
              ketenangan di <span className="font-semibold">tepi selatan.</span>
            </p>

            <p className="mt-6 max-w-md text-base leading-8 text-white/80">
              Mulai perjalananmu ke Pantai Parangtritis. Masuk ke akun untuk
              mengelola pendaftaran kunjungan dan informasi perjalananmu.
            </p>

            <p className="mt-10 text-xs uppercase tracking-[0.2em] text-white/60">
              Laut · Pasir · Pengalaman
            </p>
          </div>
        )}

        {/* Card kaca — ukuran identik di ketiga halaman. */}
        <div className="mx-auto w-full max-w-sm">
          <div className="relative overflow-hidden rounded-3xl border border-white/25 bg-white/10 backdrop-blur-xl p-6 text-white shadow-2xl">
            {staffMode ? (
              <div className="flex items-center gap-2 mb-4">
                <span className="h-px w-10 bg-white/30" />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/70">
                  AKSES PEGAWAI
                </span>
              </div>
            ) : null}

            <Link
              href="/"
              className="inline-flex min-h-9 items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal-200 transition-colors hover:text-white"
            >
              <span aria-hidden="true">←</span>
              Kembali ke beranda
            </Link>

            <div className="mt-5 flex items-center gap-2">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-base font-semibold text-white"
              >
                P
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight text-white">
                  Pantai Parangtritis
                </p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/75">
                  {staffMode ? "Akses pegawai" : brandLabel}
                </p>
              </div>
            </div>

            {children}

            <p className="mt-6 text-center text-xs leading-5 text-white/60">
              Foto latar adalah ilustrasi, bukan dokumentasi resmi destinasi.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
