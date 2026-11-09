import { redirect } from "next/navigation";
import GateCheckinForm from "./gate-checkin-form";
import GatePrintForm from "./gate-print-form";
import AccessDenied from "@/components/ui/access-denied";
import PageHeader from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth/guard";
import { canUseGate } from "@/lib/auth/roles";

export const instant = false;

export default async function GatePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canUseGate(user.role)) {
    return <AccessDenied description="Anda tidak berhak melakukan validasi di gerbang." />;
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0">
      <PageHeader
        className="print:hidden"
        eyebrow="Petugas gerbang"
        title="Gerbang"
        description="Gunakan halaman ini untuk validasi masuk (check-in) dengan barcode gerbang, atau untuk pencetakan tiket fisik booking online yang sudah lunas di gerbang. Kedua alur terpisah."
      />

      {/*
        Wrapper ini TIDAK boleh `print:hidden`: ia membungkus gelang tiket yang
        harus ikut tercetak. Hanya judul bagian yang disembunyikan saat cetak;
        sisa elemen non-tiket ditandai sendiri di dalam GatePrintForm.
      */}
      <div className="mt-8 print:mt-0">
        <h2 className="text-lg font-semibold print:hidden">
          Pencetakan tiket fisik (booking online)
        </h2>
        <GatePrintForm />
      </div>

      <div className="mt-10 print:hidden">
        <h2 className="text-lg font-semibold">Validasi masuk (check-in)</h2>
        <p className="mt-1 text-sm text-muted">
          Pindai barcode gerbang pada tiket/gelang.
        </p>
        <div className="mt-4">
          <GateCheckinForm />
        </div>
      </div>
    </section>
  );
}
