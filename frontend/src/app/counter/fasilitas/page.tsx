import { redirect } from "next/navigation";
import Link from "next/link";
import FacilityWorkspace from "./facility-workspace";
import AccessDenied from "@/components/ui/access-denied";
import PageHeader from "@/components/ui/page-header";
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
      <AccessDenied description="Halaman klaim fasilitas hanya untuk petugas loket, petugas gerbang, dan administrator. Tampilan ini hanya gerbang UI; otorisasi sebenarnya tetap ditegakkan di backend." />
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Loket tiket"
        title="Klaim fasilitas"
        description="Pindai kode tiket individual pada gelang, periksa status kunjungan, lalu klaim fasilitas yang menjadi hak pengunjung."
      />

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
