"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Ringkasan" },
  { href: "/admin/laporan/kunjungan", label: "Kunjungan" },
  { href: "/admin/laporan/transaksi", label: "Transaksi" },
  { href: "/admin/laporan/kendaraan", label: "Kendaraan" },
  { href: "/admin/laporan/identitas", label: "Identitas" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 border-b border-line pb-3 text-sm">
      {LINKS.map((link) => {
        const active = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "inline-flex min-h-11 items-center rounded-md border border-ocean/40 bg-surface-soft px-3 font-medium text-ocean"
                : "inline-flex min-h-11 items-center rounded-md border border-line px-3 text-muted hover:border-ocean/40 hover:text-ocean"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
