import Link from "next/link";

export default function HomePage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        Sistem Tiket &amp; Kunjungan
      </h1>
      <p className="mt-4 text-neutral-600">
        Prototipe pendaftaran wisatawan Pantai Parangtritis. Backend Laravel
        menjadi sumber kebenaran untuk perhitungan biaya, status transaksi,
        pembayaran, tiket, dan check-in.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/register"
          className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800"
        >
          Registrasi wisatawan
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-neutral-300 px-4 py-2 font-medium text-neutral-800 hover:bg-neutral-100"
        >
          Masuk
        </Link>
      </div>
      <p className="mt-10 text-sm text-neutral-500">
        Fase saat ini: integrasi autentikasi (registrasi, login, profil, logout).
        Booking, pembayaran, tiket, dan check-in dikerjakan pada fase berikutnya.
      </p>
    </section>
  );
}
