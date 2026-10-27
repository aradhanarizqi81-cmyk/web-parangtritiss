
import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth/guard";
import { isStaffRole, roleLabel } from "@/lib/auth/roles";

export const instant = false;

function Detail({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 border-t border-[#e4e0d5] py-5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#78816d]">
        {label}
      </dt>
      <dd className="mt-2 break-words text-sm font-medium leading-6 text-[#193d38]">
        {children}
      </dd>
    </div>
  );
}

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const initial = user.name.trim().charAt(0).toUpperCase() || "U";
  const staff = isStaffRole(user.role);

  return (
    <main className="min-h-[75vh] bg-[#faf8f2] px-5 py-10 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#78816d]">
            AKUN PENGUNJUNG
          </p>

          <div className="mt-4 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-4xl font-medium tracking-tight text-[#193d38] sm:text-5xl">
                Profil saya.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[#657168]">
                Kelola informasi akun dan akses aktivitas kunjunganmu melalui
                satu tempat.
              </p>
            </div>

            {!staff && (
              <Link
                href="/booking"
                className="inline-flex min-h-11 w-fit items-center justify-center gap-3 rounded-full bg-[#193d38] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#28564d]"
              >
                Daftar kunjungan <span aria-hidden="true">↗</span>
              </Link>
            )}
          </div>
        </div>

        <section className="overflow-hidden border border-[#e4e0d5] bg-white">
          <div className="bg-[#193d38] px-6 py-7 text-white sm:px-9 sm:py-9">
            <div className="flex items-center gap-5">
              <div
                aria-hidden="true"
                className="flex size-14 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 font-serif text-2xl text-[#e9d8b8] sm:size-16 sm:text-3xl"
              >
                {initial}
              </div>

              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#e9d8b8]">
                  {roleLabel(user.role)}
                </p>
                <h2 className="mt-2 break-words text-xl font-medium sm:text-2xl">
                  {user.name}
                </h2>
                <p className="mt-1 break-all text-sm text-white/65">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-3 sm:px-9">
            <div className="grid gap-x-10 sm:grid-cols-2">
              <Detail label="Nama lengkap">{user.name}</Detail>
              <Detail label="Alamat email">{user.email}</Detail>
              <Detail label="Nomor telepon">{user.phone || "Belum diisi"}</Detail>
              <Detail label="Peran akun">{roleLabel(user.role)}</Detail>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#78816d]">
            AKSES AKUN
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {!staff && (
              <Link
                href="/booking/history"
                className="group flex min-h-28 items-center justify-between border border-[#e4e0d5] bg-white p-5 transition hover:border-[#193d38]/50"
              >
                <div>
                  <h3 className="font-medium text-[#193d38]">
                    Riwayat booking
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#78816d]">
                    Lihat dan periksa transaksi kunjunganmu.
                  </p>
                </div>
                <span className="ml-4 text-lg transition-transform group-hover:translate-x-1">
                  ↗
                </span>
              </Link>
            )}

            <Link
              href={staff ? "/admin" : "/booking"}
              className="group flex min-h-28 items-center justify-between border border-[#e4e0d5] bg-white p-5 transition hover:border-[#193d38]/50"
            >
              <div>
                <h3 className="font-medium text-[#193d38]">
                  {staff ? "Panel operasional" : "Pendaftaran kunjungan"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#78816d]">
                  {staff
                    ? "Lanjutkan ke area kerja sesuai hak akses."
                    : "Persiapkan data pengunjung dan kendaraan."}
                </p>
              </div>
              <span className="ml-4 text-lg transition-transform group-hover:translate-x-1">
                ↗
              </span>
            </Link>
          </div>
        </section>

        {staff && (
          <p className="mt-6 border-l-2 border-[#b6a17b] bg-[#f0ece2] px-4 py-3 text-sm leading-6 text-[#53645d]">
            Menu operasional ditampilkan sesuai peran akun. Akses setiap
            tindakan tetap divalidasi oleh backend.
          </p>
        )}

        <p className="mt-8 text-xs leading-6 text-[#78816d]">
          Informasi profil ditampilkan dari akun yang sedang masuk. Data
          sensitif seperti NIK tidak ditampilkan pada halaman ini.
        </p>
      </div>
    </main>
  );
}
