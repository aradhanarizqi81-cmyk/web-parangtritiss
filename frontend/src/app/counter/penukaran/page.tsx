import { redirect } from "next/navigation";
import Link from "next/link";
import RedemptionWorkspace from "./redemption-workspace";
import AccessDenied from "@/components/ui/access-denied";
import PageHeader from "@/components/ui/page-header";
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
      <AccessDenied description="Halaman verifikasi hanya untuk petugas loket dan administrator. Tampilan ini hanya gerbang UI; otorisasi sebenarnya tetap ditegakkan di backend." />
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0">
      <PageHeader
        className="print:hidden"
        eyebrow="Loket tiket"
        title="Verifikasi booking online"
        description="Pindai kode penukaran pada booking online yang sudah lunas, periksa ringkasannya, lalu verifikasi. Loket 2 tidak mengonsumsi token dan tidak mencetak tiket; pencetakan tiket fisik dilakukan di gate."
      />

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
