import { headers } from "next/headers";
import Link from "next/link";
import SiteHeaderNav from "@/components/site-header-nav";
import { getCurrentUser } from "@/lib/auth/guard";
import {
  canUseBooking,
  canUseCounter,
  canUseDashboard,
  canUseGate,
  roleLabel,
} from "@/lib/auth/roles";

const publicLinks = [
  { href: "/#about", label: "Tentang" },
  { href: "/#services", label: "Fasilitas" },
  { href: "/#gallery", label: "Galeri" },
  { href: "/#news", label: "Informasi" },
  { href: "/#pricelist", label: "Tarif" },
  { href: "/#contact", label: "Kontak" },
];

export default async function SiteHeader() {
  const headersList = await headers();
  const pathname =
    headersList.get("x-invoke-path") ||
    headersList.get("x-matched-path") ||
    headersList.get("x-pathname") ||
    "";

  // Portal operasional harus terpisah dari navigasi wisatawan.
  if (pathname.startsWith("/staff")) {
    return null;
  }

  const user = await getCurrentUser();

  const staffLinks = user
    ? [
        ...(canUseDashboard(user.role)
          ? [{ href: "/admin", label: "Dasbor" }]
          : []),
        ...(canUseCounter(user.role)
          ? [{ href: "/counter", label: "Loket" }]
          : []),
        ...(canUseGate(user.role) ? [{ href: "/gate", label: "Gerbang" }] : []),
        ...(canUseBooking(user.role)
          ? [{ href: "/booking", label: "Booking" }]
          : []),
        { href: "/profile", label: "Profil" },
      ]
    : [];

  return (
    <header className="sticky top-0 z-50 border-b border-[#e4e1d7] bg-[#faf8f2]/95 backdrop-blur-md print:hidden">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-x-6 gap-y-3 px-5 py-4 lg:px-10">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#174a45] text-lg text-white">
            P
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-wide text-[#183b38]">
              PANTAI PARANGTRITIS
            </span>
            <span className="block text-[10px] tracking-[0.2em] text-[#6b7771]">
              PESONA PESISIR YOGYAKARTA
            </span>
          </span>
        </Link>

        <SiteHeaderNav
          links={[...publicLinks, ...staffLinks]}
          user={
            user ? { name: user.name, roleLabel: roleLabel(user.role) } : null
          }
        />
      </div>
    </header>
  );
}
