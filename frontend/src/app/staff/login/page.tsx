import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import LogoutButton from "@/components/logout-button";
import { buttonClasses } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/guard";
import { roleLabel, staffDestination } from "@/lib/auth/roles";
import StaffLoginForm from "./staff-login-form";
import AuthShell from "@/components/layout/auth-shell";

// Halaman ini membaca cookie sesi lalu memvalidasinya ke Laravel, jadi tidak
// boleh dirender saat build (pola yang sama dengan /profile).
export const instant = false;

export const metadata: Metadata = {
  title: "Portal Operasional | Pantai Parangtritis",
  description:
    "Pintu masuk khusus administrator, petugas loket, dan petugas gerbang Pantai Parangtritis.",
};

export default async function StaffLoginPage() {
  const user = await getCurrentUser();
  const destination = user ? staffDestination(user.role) : null;

  // Pegawai yang sudah masuk langsung diantar ke areanya. Tujuan ini hanya
  // berasal dari role yang diverifikasi backend, dan halaman tujuan tidak
  // pernah mengalihkan kembali ke sini, sehingga tidak ada lingkaran redirect.
  if (destination) {
    redirect(destination);
  }

  // Wisatawan yang masih masuk tidak dibiarkan mencoba kredensial lain di
  // portal operasional; tampilkan penolakan yang jelas beserta jalan keluar.
  if (user) {
    return (
      <AuthShell
        videoSrc="/videos/From Kickpin.com-1.mp4"
        poster="/images/auth-poster.jpg"
        overlayClass="from-ocean-950/85 via-ocean-900/75 to-ocean-800/60"
        showEditorial={false}
        staffMode={true}
        brandLabel="Akses pegawai"
      >
        <div data-testid="staff-portal-denied">
          <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-200">
            Akses ditolak
          </p>
          <h1 className="mt-3 text-2xl font-semibold leading-tight text-white">
            Portal khusus pegawai
          </h1>
          <p className="mt-4 text-sm leading-6 text-white/80">
            Akun{" "}
            <span className="font-medium text-white">{user.email}</span>{" "}
            terdaftar sebagai {roleLabel(user.role)}. Portal operasional hanya
            untuk administrator, petugas loket, dan petugas gerbang.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/profile" className={buttonClasses({ size: "md" })}>
              Buka area wisatawan
            </Link>
            <LogoutButton />
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      videoSrc="/videos/video4.mp4"
      poster="/images/auth-poster.jpg"
      overlayClass="from-ocean-950/80 via-ocean-900/70 to-ocean-800/50"
      showEditorial={false}
      staffMode={true}
      brandLabel="Akses pegawai"
    >
      <h1 className="mt-4 text-xl font-semibold leading-tight text-white sm:text-2xl text-center">
        Masuk petugas
      </h1>
      <p className="mt-2 text-sm leading-6 text-white/80 text-center">
        Gunakan email dan password akun dinas Anda untuk melanjutkan ke area
        kerja.
      </p>

      <StaffLoginForm />
    </AuthShell>
  );
}
