import { redirect } from "next/navigation";
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
        <p className="mt-2 text-sm text-neutral-600">
          Halaman loket hanya untuk petugas loket dan administrator. Tampilan ini
          hanya gerbang UI; otorisasi sebenarnya tetap ditegakkan di backend.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Loket tiket</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Catat kunjungan wisatawan, hitung tarif dari database, lalu konfirmasi
        pembayaran tunai pada halaman detail.
      </p>

      <div className="mt-8">
        <CounterWorkspace />
      </div>
    </section>
  );
}
