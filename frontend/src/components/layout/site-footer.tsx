import { headers } from "next/headers";
import Link from "next/link";
import { isChromelessPath } from "@/lib/layout/paths";

const explore = [
  { href: "/#about", label: "Tentang destinasi" },
  { href: "/#discover", label: "Destinasi pesisir" },
  { href: "/#places", label: "Pengalaman kunjungan" },
];

const services = [
  { href: "/booking", label: "Daftar kunjungan" },
  { href: "/booking/history", label: "Riwayat booking" },
  { href: "/login", label: "Masuk wisatawan" },
  { href: "/staff/login", label: "Portal petugas" },
];

export default async function SiteFooter() {
  const pathname = (await headers()).get("x-pathname") ?? "";

  if (isChromelessPath(pathname)) {
    return null;
  }

  return (
    <footer className="border-t border-line bg-surface print:hidden">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <p className="text-sm font-semibold tracking-[0.14em] text-foreground">
            PANTAI PARANGTRITIS
          </p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted">
            Platform pendaftaran dan pengelolaan data kunjungan wisatawan
            Pantai Parangtritis, Kabupaten Bantul, Yogyakarta.
          </p>
          <p className="mt-4 text-xs leading-5 text-muted">
            Foto pada situs ini adalah ilustrasi dari Unsplash, bukan
            dokumentasi resmi destinasi.
          </p>
        </div>

        <nav aria-label="Jelajahi destinasi" className="text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            Jelajahi
          </p>
          <ul className="mt-3 space-y-2">
            {explore.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-muted transition-colors hover:text-ocean"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Layanan kunjungan" className="text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            Layanan
          </p>
          <ul className="mt-3 space-y-2">
            {services.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-muted transition-colors hover:text-ocean"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-5 py-4 text-xs leading-5 text-muted lg:px-8">
          Prototipe pengembangan. Tarif bersifat konfigurasi awal, bukan tarif
          resmi.
        </p>
      </div>
    </footer>
  );
}
