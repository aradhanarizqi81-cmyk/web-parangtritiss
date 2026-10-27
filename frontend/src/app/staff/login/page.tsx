import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import LogoutButton from "@/components/logout-button";
import { getCurrentUser } from "@/lib/auth/guard";
import { roleLabel, staffDestination } from "@/lib/auth/roles";
import StaffLoginForm from "./staff-login-form";

// Halaman ini membaca cookie sesi lalu memvalidasinya ke Laravel, jadi tidak
// boleh dirender saat build (pola yang sama dengan /profile).
export const instant = false;

export const metadata: Metadata = {
  title: "Portal Operasional — Pantai Parangtritis",
  description:
    "Pintu masuk khusus administrator, petugas loket, dan petugas gerbang Pantai Parangtritis.",
};

/**
 * Bingkai visual portal operasional. Memakai palet yang sama dengan halaman
 * lain supaya tetap satu identitas, tetapi dengan latar laut gelap dan segel
 * "Portal Operasional" agar jelas berbeda dari portal wisatawan.
 */
function PortalFrame({ children }: { children: ReactNode }) {
  return (
    <section className="relative isolate flex min-h-[720px] items-center justify-center overflow-hidden bg-[#0d2b28] px-4 py-12 sm:px-6 lg:min-h-[780px]">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-[radial-gradient(125%_85%_at_50%_0%,#1c4f49_0%,#10332f_48%,#081e1c_100%)]"
      />

      <div className="w-full max-w-md">
        <p className="flex items-center justify-center gap-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-[#e9d8b8]">
          <span aria-hidden="true" className="h-px w-8 bg-[#e9d8b8]/50" />
          Portal Operasional
          <span aria-hidden="true" className="h-px w-8 bg-[#e9d8b8]/50" />
        </p>

        <div className="relative mt-5 overflow-hidden rounded-2xl border border-[#e4e0d5] bg-[#fbf9f3] shadow-[0_28px_70px_rgba(3,16,15,0.45)]">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[#b6a17b]" />

          <div className="p-6 sm:p-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#657168] transition-colors hover:text-[#193d38]"
            >
              <span aria-hidden="true">←</span> Kembali ke beranda
            </Link>

            <div className="mt-7 flex items-center gap-3.5">
              <span
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#193d38] font-serif text-lg text-[#e9d8b8]"
              >
                P
              </span>
              <div className="min-w-0">
                <p className="font-serif text-base leading-tight text-[#193d38]">
                  Pantai Parangtritis
                </p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#78816d]">
                  Akses pegawai
                </p>
              </div>
            </div>

            {children}
          </div>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-white/55">
          Halaman ini hanya untuk administrator, petugas loket, dan petugas
          gerbang.
        </p>
      </div>
    </section>
  );
}

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
      <PortalFrame>
        <div data-testid="staff-portal-denied">
          <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#a8743f]">
            Akses ditolak
          </p>
          <h1 className="mt-3 font-serif text-2xl leading-tight text-[#193d38]">
            Portal khusus pegawai
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#657168]">
            Akun{" "}
            <span className="font-medium text-[#193d38]">{user.email}</span>{" "}
            terdaftar sebagai {roleLabel(user.role)}. Portal operasional hanya
            untuk administrator, petugas loket, dan petugas gerbang.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/profile"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#193d38] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#28564d]"
            >
              Buka area wisatawan
            </Link>
            <LogoutButton />
          </div>
        </div>
      </PortalFrame>
    );
  }

  return (
    <PortalFrame>
      <h1 className="mt-8 font-serif text-2xl leading-tight text-[#193d38] sm:text-3xl">
        Masuk petugas
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#657168]">
        Gunakan email dan password akun dinas Anda untuk melanjutkan ke area
        kerja.
      </p>

      <StaffLoginForm />
    </PortalFrame>
  );
}
