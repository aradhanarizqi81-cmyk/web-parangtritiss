import { redirect } from "next/navigation";
import Link from "next/link";
import BookingForm from "./booking-form";
import AccessDenied from "@/components/ui/access-denied";
import { buttonClasses } from "@/components/ui/button";
import PageHeader from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth/guard";
import { canUseBooking, isVisitor } from "@/lib/auth/roles";

// Pengguna anonim sudah dialihkan proxy. Halaman memvalidasi token ke Laravel
// dan boleh memblokir agar redirect untuk token tidak valid diproses di server.
export const instant = false;

export default async function BookingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canUseBooking(user.role)) {
    return (
      <AccessDenied description="Booking online hanya untuk wisatawan. Tampilan ini hanya gerbang UI; otorisasi sebenarnya tetap ditegakkan di backend." />
    );
  }

  // Admin tidak membuat booking; diarahkan ke daftar booking untuk dipantau.
  if (!isVisitor(user.role)) {
    redirect("/booking/history");
  }

  return (
    <div className="min-h-screen bg-app">
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Booking online"
          title="Booking tiket online"
          description="Daftarkan pengunjung, lalu selesaikan pembayaran lewat simulasi akademik pada halaman detail. Tiket diterbitkan setelah pembayaran berhasil."
          actions={
            <Link
              href="/booking/history"
              className={buttonClasses({ variant: "secondary", size: "md" })}
            >
              Riwayat booking
            </Link>
          }
        />

        <div className="mt-8">
          <BookingForm />
        </div>
      </section>
    </div>
  );
}
