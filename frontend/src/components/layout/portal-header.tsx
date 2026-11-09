import Link from "next/link";
import PortalNav from "@/components/layout/portal-nav";
import LogoutButton from "@/components/logout-button";
import type { Role } from "@/lib/api/types";
import { getCurrentUser } from "@/lib/auth/guard";
import { roleLabel } from "@/lib/auth/roles";

function linksFor(role: Role): Array<{ href: string; label: string }> {
  if (role === "admin") {
    return [
      { href: "/admin", label: "Dasbor" },
      { href: "/counter", label: "Loket" },
      { href: "/gate", label: "Gerbang" },
      { href: "/profile", label: "Profil" },
    ];
  }

  if (role === "cashier") {
    return [
      { href: "/counter", label: "Loket" },
      { href: "/counter/penukaran", label: "Verifikasi" },
      { href: "/counter/fasilitas", label: "Fasilitas" },
    ];
  }

  if (role === "gate_staff") {
    return [{ href: "/gate", label: "Gerbang" }];
  }

  return [{ href: "/profile", label: "Profil" }];
}

/**
 * Chrome area kerja petugas. Latar laut gelap dan label "Portal operasional"
 * memisahkan konteks dari situs wisatawan, sementara navigasi hanya memuat
 * area yang memang bisa dibuka role tersebut.
 */
export default async function PortalHeader() {
  const user = await getCurrentUser();
  const links = user ? linksFor(user.role) : [];
  const home =
    user?.role === "admin"
      ? "/admin"
      : user?.role === "gate_staff"
        ? "/gate"
        : "/counter";

  return (
    <header className="sticky top-0 z-50 border-b border-ivory/10 bg-ocean text-ivory print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href={home}
          aria-label="Portal operasional Pantai Parangtritis"
          className="flex shrink-0 items-center gap-2.5"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ivory text-sm font-semibold text-ocean">
            P
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold tracking-[0.12em]">
              PARANGTRITIS
            </span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-sand">
              Portal operasional
            </span>
          </span>
        </Link>

        <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1">
          <PortalNav links={links} />
        </div>

        <div className="order-2 ml-auto flex items-center gap-3 sm:order-3">
          {user ? (
            <span className="hidden text-xs text-ivory/70 lg:inline">
              {user.name} · {roleLabel(user.role)}
            </span>
          ) : null}
          <LogoutButton variant="portal" />
        </div>
      </div>
    </header>
  );
}
