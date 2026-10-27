import { redirect } from "next/navigation";
import Link from "next/link";
import FacilityWorkspace from "./facility-workspace";
import { getCurrentUser } from "@/lib/auth/guard";
import { canUseCounter } from "@/lib/auth/roles";

// Pengguna anonim sudah dialihkan proxy. Halaman memvalidasi token ke Laravel
// dan boleh memblokir agar redirect untuk token tidak valid diproses di server.
export const instant = false;

export default async function CounterFacilityPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canUseCounter(user.role)) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-semibold">Akses ditolak</h1>
        <p className="mt-2 text-sm text-muted">
          Halaman klaim fasilitas hanya untuk petugas loket dan administrator.
          Tampilan ini hanya gerbang UI; otorisasi sebenarnya tetap ditegakkan
          di backend.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-xs uppercase tracking-wide text-muted">Loket tiket</p>
      <h1 className="text-2xl font-semibold">Klaim fasilitas</h1>
      <p className="mt-2 text-sm text-muted">
        Pindai kode tiket individual pada gelang, periksa status kunjungan, lalu
        klaim fasilitas yang menjadi hak pengunjung.
      </p>

      <div className="mt-8">
        <FacilityWorkspace />
      </div>

      <div className="mt-8">
        <Link
          href="/counter"
          className="text-sm font-medium text-ocean hover:underline"
        >
          Kembali ke loket tiket
        </Link>
      </div>
    </section>
  );
}
