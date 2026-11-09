import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import SiteHeader from "@/components/site-header";
import AccessDenied from "@/components/ui/access-denied";
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
      <div className="min-h-screen bg-app">
        <AccessDenied description="Dasbor dan laporan hanya untuk administrator. Tampilan ini hanya gerbang UI; otorisasi sebenarnya tetap ditegakkan di backend." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app">
      <SiteHeader />
      <AdminSidebar />
      <section className="ml-64 px-6 py-8 sm:px-8 lg:px-10">
        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}
