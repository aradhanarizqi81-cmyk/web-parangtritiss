import { redirect } from "next/navigation";
import GateCheckinForm from "./gate-checkin-form";
import { getCurrentUser } from "@/lib/auth/guard";
import { canUseGate } from "@/lib/auth/roles";

export const instant = false;

export default async function GatePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canUseGate(user.role)) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-semibold">Akses ditolak</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Anda tidak berhak melakukan validasi di gerbang.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <p className="text-xs uppercase tracking-wide text-neutral-500">
        Petugas gerbang
      </p>
      <h1 className="text-2xl font-semibold">Validasi tiket</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Pindai barcode pada tiket, atau ketik tokennya lalu tekan Validasi.
        Setiap barcode mewakili satu transaksi/rombongan.
      </p>

      <div className="mt-6">
        <GateCheckinForm />
      </div>
    </section>
  );
}
