import { redirect } from "next/navigation";
import Link from "next/link";
import CounterWorkspace from "./counter-workspace";
import { getCurrentUser } from "@/lib/auth/guard";
import { canUseCounter } from "@/lib/auth/roles";

// Pengguna anonim sudah dialihkan proxy. Halaman memvalidasi token ke Laravel
// dan boleh memblokir agar redirect untuk token tidak valid diproses di server.
export const instant = false;

export default async function CounterPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canUseCounter(user.role)) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-semibold">Akses ditolak</h1>
        <p className="mt-2 text-sm text-muted">
          Halaman loket hanya untuk petugas loket dan administrator. Tampilan ini
          hanya gerbang UI; otorisasi sebenarnya tetap ditegakkan di backend.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Loket tiket</h1>
      <p className="mt-2 text-sm text-muted">
        Catat kunjungan wisatawan, hitung tarif dari database, lalu konfirmasi
        pembayaran tunai pada halaman detail.
      </p>

      <Link
        href="/counter/penukaran"
        className="mt-6 flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 transition-colors hover:border-ocean/50 hover:bg-surface-soft"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">
            Penukaran tiket fisik
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            Ambil booking online yang sudah lunas dan cetak gelang untuk setiap
            pengunjung.
          </span>
        </span>
        <span className="shrink-0 text-sm font-medium text-ocean">
          Buka meja penukaran →
        </span>
      </Link>

      <Link
        href="/counter/fasilitas"
        className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 transition-colors hover:border-ocean/50 hover:bg-surface-soft"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">
            Klaim fasilitas
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            Pindai kode tiket pada gelang dan catat klaim fasilitas pengunjung
            yang sudah check-in.
          </span>
        </span>
        <span className="shrink-0 text-sm font-medium text-ocean">
          Buka meja fasilitas →
        </span>
      </Link>

      <div className="mt-8">
        <CounterWorkspace />
      </div>
    </section>
  );
}
