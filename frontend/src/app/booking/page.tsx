import { redirect } from "next/navigation";
import Link from "next/link";
import BookingForm from "./booking-form";
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
      <section className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-semibold">Akses ditolak</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Booking online hanya untuk wisatawan. Tampilan ini hanya gerbang UI;
          otorisasi sebenarnya tetap ditegakkan di backend.
        </p>
      </section>
    );
  }

  // Admin tidak membuat booking; diarahkan ke daftar booking untuk dipantau.
  if (!isVisitor(user.role)) {
    redirect("/booking/history");
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Booking tiket online</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Daftarkan pengunjung, lalu selesaikan pembayaran lewat simulasi
            akademik pada halaman detail. Tiket diterbitkan setelah pembayaran
            berhasil.
          </p>
        </div>
        <Link
          href="/booking/history"
          className="text-sm font-medium text-emerald-800 hover:underline"
        >
          Riwayat booking
        </Link>
      </div>

      <div className="mt-8">
        <BookingForm />
      </div>
    </section>
  );
}
