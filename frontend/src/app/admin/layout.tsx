import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import AdminNav from "@/components/admin/admin-nav";
import { getCurrentUser } from "@/lib/auth/guard";
import { canUseDashboard } from "@/lib/auth/roles";

// Halaman membaca cookie sesi dan data terbaru dari Laravel, jadi tidak boleh
// diprerender; redirect untuk token tidak valid diproses di server.
export const instant = false;

/**
 * Gerbang tampilan untuk seluruh area dasbor & laporan. Backend tetap
 * menegakkan otorisasi lewat middleware `role:admin` + policy.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canUseDashboard(user.role)) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-semibold">Akses ditolak</h1>
        <p className="mt-2 text-sm text-muted">
          Dasbor dan laporan hanya untuk administrator. Tampilan ini hanya
          gerbang UI; otorisasi sebenarnya tetap ditegakkan di backend.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <AdminNav />
      <div className="mt-6">{children}</div>
    </section>
  );
}
