import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import LogoutButton from "@/components/logout-button";
import { buttonClasses } from "@/components/ui/button";
import Card from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth/guard";
import {
  canUseBooking,
  roleLabel,
  staffDestination,
} from "@/lib/auth/roles";

export const instant = false;

function formatRegisteredAt(value: string | null): string {
  if (!value) return "Belum tersedia";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Belum tersedia";

  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(date);
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </dt>
      <dd className="break-words text-sm font-medium text-foreground sm:text-right">
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
  const canBook = canUseBooking(user.role);
  const destination = staffDestination(user.role);

  return (
    <div className="min-h-screen bg-app">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <PageHeader
          eyebrow="Akun pengunjung"
          title="Profil saya"
          description="Kelola informasi akun dan akses aktivitas kunjunganmu melalui satu tempat."
        />

        <section
          aria-labelledby="profile-name"
          className="mt-8 overflow-hidden rounded-sm border border-teal-900/10 px-6 py-7 text-ivory sm:px-8 sm:py-8"
          style={{
            background:
              "linear-gradient(135deg, #0f3f4f 0%, #1b5e6f 55%, #2f7d6b 100%)",
          }}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex size-18 shrink-0 items-center justify-center rounded-full border border-ivory/25 bg-ivory/10 text-2xl font-semibold text-sand sm:size-20">
              {initial}
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sand">
                {roleLabel(user.role)}
              </p>
              <h2
                id="profile-name"
                className="mt-1 break-words text-2xl font-semibold tracking-tight text-ivory"
              >
                {user.name}
              </h2>
              <p className="mt-1 break-all text-sm leading-6 text-ivory/80">
                {user.email}
              </p>
            </div>
          </div>

          {canBook ? (
            <div className="mt-6 border-t border-ivory/15 pt-5">
              <Link
                href="/booking"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-ivory px-5 text-sm font-semibold text-ocean transition-colors hover:bg-sand"
              >
                Daftar kunjungan
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          ) : null}
        </section>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="flex h-full flex-col">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                Identitas
              </p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">
                Data akun
              </h2>
            </div>

            <dl className="mt-4 flex-1 divide-y divide-line text-sm">
              <DetailRow label="Nama lengkap">{user.name}</DetailRow>
              <DetailRow label="Email">{user.email}</DetailRow>
              <DetailRow label="Nomor telepon">
                {user.phone?.trim() ? user.phone : "Belum diisi"}
              </DetailRow>
              <DetailRow label="Terdaftar sejak">
                {formatRegisteredAt(user.created_at)}
              </DetailRow>
            </dl>
          </Card>

          <Card className="flex h-full flex-col">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                Akses
              </p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">
                Keamanan
              </h2>
            </div>

            <dl className="mt-4 flex-1 divide-y divide-line text-sm">
              <DetailRow label="Status sesi">
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full bg-success"
                  />
                  Aktif
                </span>
              </DetailRow>
              <DetailRow label="Metode masuk">
                Email dan kata sandi
              </DetailRow>
              <DetailRow label="Penyimpanan sesi">
                Cookie HttpOnly
              </DetailRow>
              <DetailRow label="Peran akun">
                {roleLabel(user.role)}
              </DetailRow>
            </dl>

            <div className="mt-5 border-t border-line pt-4">
              <LogoutButton className="w-full sm:w-auto" />
            </div>
          </Card>

          <Card className="flex h-full flex-col md:col-span-2 lg:col-span-1">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                {canBook ? "Aktivitas" : "Operasional"}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">
                {canBook ? "Riwayat booking" : "Area kerja"}
              </h2>
            </div>

            <p className="mt-2 flex-1 text-sm leading-6 text-muted">
              {canBook
                ? "Lihat dan periksa transaksi kunjungan yang pernah dibuat dari akun ini."
                : "Buka portal operasional sesuai peran akun. Setiap tindakan tetap divalidasi oleh backend."}
            </p>

            {canBook ? (
              <Link
                href="/booking/history"
                className={buttonClasses({
                  variant: "secondary",
                  className: "mt-5",
                })}
              >
                Buka riwayat
                <span aria-hidden="true">↗</span>
              </Link>
            ) : destination ? (
              <Link
                href={destination}
                className={buttonClasses({
                  variant: "secondary",
                  className: "mt-5",
                })}
              >
                Buka area kerja
                <span aria-hidden="true">↗</span>
              </Link>
            ) : null}
          </Card>
        </div>

        <p className="mt-6 text-xs leading-6 text-muted">
          Informasi profil ditampilkan dari akun yang sedang masuk. Data
          sensitif seperti NIK tidak ditampilkan pada halaman ini.
        </p>
      </div>
    </div>
  );
}
