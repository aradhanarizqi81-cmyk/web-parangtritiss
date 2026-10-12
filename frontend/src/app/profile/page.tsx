import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth/guard";
import { isStaffRole, roleLabel } from "@/lib/auth/roles";

// Pengguna anonim sudah dialihkan oleh proxy (src/proxy.ts). Halaman ini tetap
// memvalidasi token ke Laravel, dan menandai segmen boleh memblokir agar
// redirect untuk token yang tidak valid tetap diproses di server.
export const instant = false;

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4">
      <dt className="text-xs uppercase tracking-wide text-neutral-500">
        {label}
      </dt>
      <dd className="mt-1 text-neutral-900">{children}</dd>
    </div>
  );
}

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Profil</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Data diambil dari endpoint <code>/api/v1/auth/me</code> menggunakan token
        yang tersimpan di cookie HttpOnly.
      </p>

      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Detail label="Nama">{user.name}</Detail>
        <Detail label="Email">{user.email}</Detail>
        <Detail label="Peran">{roleLabel(user.role)}</Detail>
        <Detail label="Telepon">{user.phone ?? "—"}</Detail>
      </dl>

      {isStaffRole(user.role) ? (
        <p className="mt-8 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Menu operasional untuk peran ini tersedia pada fase berikutnya.
          Tampilan berbasis peran hanya untuk pengalaman pengguna; otorisasi tetap
          ditegakkan di backend.
        </p>
      ) : (
        <p className="mt-8 text-sm text-neutral-500">
          Booking online, pembayaran, tiket, dan check-in dikerjakan pada fase
          berikutnya.
        </p>
      )}
    </section>
  );
}
