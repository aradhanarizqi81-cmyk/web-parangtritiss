import { redirect } from "next/navigation";
import Link from "next/link";
import RedemptionWorkspace from "./redemption-workspace";
import { getCurrentUser } from "@/lib/auth/guard";
import { canUseCounter } from "@/lib/auth/roles";

// Pengguna anonim sudah dialihkan proxy. Halaman memvalidasi token ke Laravel
// dan boleh memblokir agar redirect untuk token tidak valid diproses di server.
export const instant = false;

export default async function CounterRedemptionPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canUseCounter(user.role)) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-semibold">Akses ditolak</h1>
        <p className="mt-2 text-sm text-muted">
          Halaman penukaran hanya untuk petugas loket dan administrator.
          Tampilan ini hanya gerbang UI; otorisasi sebenarnya tetap
          ditegakkan di backend.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 print:max-w-none print:px-0 print:py-0">
      <div className="print:hidden">
        <p className="text-xs uppercase tracking-wide text-muted">
          Loket tiket
        </p>
        <h1 className="text-2xl font-semibold">Penukaran tiket fisik</h1>
        <p className="mt-2 text-sm text-muted">
          Pindai kode penukaran pada booking online yang sudah lunas, periksa
          ringkasannya, konfirmasi penukaran, lalu cetak gelang untuk setiap
          pengunjung.
        </p>
      </div>

      <div className="mt-8 print:mt-0">
        <RedemptionWorkspace />
      </div>

      <div className="mt-8 print:hidden">
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
