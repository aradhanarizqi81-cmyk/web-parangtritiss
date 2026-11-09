import { redirect } from "next/navigation";
import Link from "next/link";
import CounterWorkspace from "./counter-workspace";
import AccessDenied from "@/components/ui/access-denied";
import Card from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth/guard";
import { canUseCounter } from "@/lib/auth/roles";

// Pengguna anonim sudah dialihkan proxy. Halaman memvalidasi token ke Laravel
// dan boleh memblokir agar redirect untuk token tidak valid diproses di server.
export const instant = false;

const WORKSPACES = [
  {
    href: "/counter/penukaran",
    title: "Penukaran tiket fisik",
    description:
      "Ambil booking online yang sudah lunas dan cetak gelang untuk setiap pengunjung.",
    action: "Buka meja penukaran",
  },
  {
    href: "/counter/fasilitas",
    title: "Klaim fasilitas",
    description:
      "Pindai kode tiket pada gelang dan catat klaim fasilitas pengunjung yang sudah check-in.",
    action: "Buka meja fasilitas",
  },
];

export default async function CounterPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canUseCounter(user.role)) {
    return (
      <AccessDenied description="Halaman loket hanya untuk petugas loket, petugas gerbang, dan administrator. Tampilan ini hanya gerbang UI; otorisasi sebenarnya tetap ditegakkan di backend." />
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Petugas loket"
        title="Loket tiket"
        description="Catat kunjungan wisatawan, hitung tarif dari database, lalu konfirmasi pembayaran tunai pada halaman detail."
      />

      <div className="mt-6 grid gap-3">
        {WORKSPACES.map((workspace) => (
          <Link key={workspace.href} href={workspace.href} className="block">
            <Card className="flex min-w-0 flex-wrap items-center justify-between gap-3 transition-colors hover:border-ocean/40 hover:shadow-raised">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {workspace.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {workspace.description}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium text-ocean">
                {workspace.action} →
              </span>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <CounterWorkspace />
      </div>
    </section>
  );
}
