import { headers } from "next/headers";
import SiteHeaderNav from "@/components/site-header-nav";
import type { Role } from "@/lib/api/types";
import { getCurrentUser } from "@/lib/auth/guard";
import { roleLabel } from "@/lib/auth/roles";
import { isChromelessPath } from "@/lib/layout/paths";

/* Empat tautan navigasi beranda mengikuti referensi: Home, About, Discover, Places. */
const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/#about", label: "About" },
  { href: "/#discover", label: "Discover" },
  { href: "/#places", label: "Places" },
];

/**
 * Menu akun mengikuti peran. Petugas loket dan petugas gerbang tidak memakai
 * profil di navbar operasional; pintu keluarnya tetap tersedia.
 */
function accountLinksFor(role: Role): Array<{ href: string; label: string }> {
  switch (role) {
    case "admin":
      return [
        { href: "/admin", label: "Dasbor" },
        { href: "/profile", label: "Profil" },
      ];
    case "cashier":
      return [{ href: "/counter", label: "Loket" }];
    case "gate_staff":
      return [{ href: "/gate", label: "Gerbang" }];
    default:
      return [
        { href: "/booking", label: "Booking" },
        { href: "/profile", label: "Profil" },
      ];
  }
}

export default async function SiteHeader() {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";

  // Hanya halaman masuk/daftar dan portal petugas yang tidak menampilkan
  // navigasi wisatawan, agar tidak ada dua jalur navigasi yang bersaing.
  if (isChromelessPath(pathname)) {
    return null;
  }

  const user = await getCurrentUser();
  const accountLinks = user ? accountLinksFor(user.role) : [];
  const links = [...publicLinks, ...accountLinks];
  const navUser = user ? { name: user.name, role: roleLabel(user.role) } : null;

  const isHome = pathname === "/" || pathname === "";

  return (
    <>
      {/*
       * Navbar memakai posisi fixed agar dapat mengambang di atas hero beranda.
       * Di halaman padat, spacer in-flow ini menyediakan ruang yang sama dengan
       * tinggi navbar, sehingga konten tidak tertutup tanpa margin negatif.
       */}
      {isHome ? null : (
        <div aria-hidden="true" className="h-20 shrink-0 md:h-24" />
      )}

      <SiteHeaderNav
        links={links}
        accountLinks={accountLinks}
        user={navUser}
        activePath={pathname}
        tone={isHome ? "transparent" : "solid"}
        actions={
          user
            ? []
            : [
                { href: "/login", label: "Masuk" },
                { href: "/register", label: "Daftar kunjungan" },
              ]
        }
      />
    </>
  );
}
