"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/logout-button";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/laporan/kunjungan", label: "Kunjungan" },
  { href: "/admin/laporan/transaksi", label: "Transaksi" },
  { href: "/admin/laporan/kendaraan", label: "Kendaraan" },
  { href: "/admin/laporan/identitas", label: "Identitas" },
];

const ICONS: Record<string, string> = {
  Dashboard: `
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 13v9m0 0V9m0 0l-8-3m8 3l8-3" />
    </svg>
  `,
  Kunjungan: `
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  `,
  Transaksi: `
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  `,
  Kendaraan: `
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 18h7a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v7a2 2 0 002 2zM5 18h7a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zM17 18h7a2 2 0 002-2V9a2 2 0 00-2-2h-7a2 2 0 00-2 2v7a2 2 0 002 2zM17 18h7a2 2 0 012 2v5a2 2 0 01-2 2h-7a2 2 0 01-2-2v-5a2 2 0 012-2z" />
    </svg>
  `,
  Identitas: `
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  `,
};

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 w-64 bg-slate-900 text-slate-200 border-r border-slate-800">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-medium">
            A
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">Admin</p>
            <p className="text-xs text-slate-400 truncate">Administrator</p>
          </div>
        </div>
      </div>

      <nav className="p-3 space-y-1">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${active ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}
              `}
            >
              <span className="w-5 text-center" dangerouslySetInnerHTML={{ __html: ICONS[link.label] ?? "" }} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-4 border-t border-slate-800">
        <LogoutButton className="w-full text-slate-400 hover:text-white border-slate-700 hover:border-slate-500 hover:bg-slate-800" />
      </div>
    </aside>
  );
}
