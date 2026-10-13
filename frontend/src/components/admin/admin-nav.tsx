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
    <nav className="flex flex-wrap gap-2 border-b border-neutral-200 pb-3 text-sm">
      {LINKS.map((link) => {
        const active = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 font-medium text-emerald-900"
                : "rounded-md border border-neutral-200 px-3 py-1.5 text-neutral-700 hover:border-emerald-300 hover:text-neutral-900"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
