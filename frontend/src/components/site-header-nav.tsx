"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import LogoutButton from "@/components/logout-button";

type HeaderLink = { href: string; label: string };

const DRAWER_ID = "site-header-drawer";

/**
 * Navigasi kepala situs. Di layar md ke atas tampil sebagai baris link; di
 * bawah md tampil tombol menu yang membuka laci (off-canvas). Nama dan role
 * dihitung di server lalu diteruskan sebagai data; komponen ini hanya urusan
 * tampilan serta interaksi buka/tutup.
 */
export default function SiteHeaderNav({
  links,
  user,
}: {
  links: HeaderLink[];
  user: { name: string; roleLabel: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Pindahkan fokus ke dalam laci saat dibuka.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  // Tutup laci dengan Escape dan kembalikan fokus ke tombol menu.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Kunci gulir latar belakang selama laci terbuka, dan tutup laci bila
  // viewport melebar sampai breakpoint md (laci disembunyikan oleh CSS).
  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const desktop = window.matchMedia("(min-width: 768px)");
    function onChange(event: MediaQueryListEvent) {
      if (event.matches) setOpen(false);
    }
    desktop.addEventListener("change", onChange);

    return () => {
      document.body.style.overflow = previous;
      desktop.removeEventListener("change", onChange);
    };
  }, [open]);

  function closeDrawer() {
    setOpen(false);
    menuButtonRef.current?.focus();
  }

  return (
    <div className="flex items-center gap-3">
      {/* Navigasi layar lebar */}
      <nav
        aria-label="Navigasi utama"
        className="hidden items-center gap-x-5 gap-y-2 text-sm text-[#435a53] md:flex md:flex-wrap md:justify-end"
      >
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="transition-colors hover:text-[#174a45]"
          >
            {item.label}
          </Link>
        ))}

        {user ? (
          <>
            <span className="hidden text-xs text-[#6b7771] xl:inline">
              {user.name} · {user.roleLabel}
            </span>
            <LogoutButton />
          </>
        ) : (
          <>
            <Link href="/login" className="transition-colors hover:text-[#174a45]">
              Masuk
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#174a45] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#103632]"
            >
              Daftar Kunjungan
            </Link>
          </>
        )}
      </nav>

      {/* Tombol menu layar kecil */}
      <button
        ref={menuButtonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={DRAWER_ID}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-line px-3 text-[#174a45] transition hover:bg-surface-soft md:hidden"
      >
        <span className="sr-only">
          {open ? "Tutup menu navigasi" : "Buka menu navigasi"}
        </span>
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          {open ? (
            <>
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </>
          ) : (
            <>
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </>
          )}
        </svg>
      </button>

      {/* Laci (off-canvas) layar kecil.
          Dirender lewat portal ke <body>: header memakai `backdrop-blur`, dan
          `backdrop-filter` menciptakan containing block untuk elemen
          `position: fixed`, sehingga tanpa portal laci hanya setinggi header. */}
      {open && typeof document !== "undefined" ? createPortal(
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/30 md:hidden"
            aria-hidden="true"
            onClick={closeDrawer}
          />

          <div
            id={DRAWER_ID}
            ref={panelRef}
            tabIndex={-1}
            className="fixed inset-y-0 right-0 z-[70] flex w-72 max-w-[85vw] flex-col overflow-y-auto border-l border-line bg-[#faf8f2] p-5 outline-none md:hidden"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold tracking-wide text-[#183b38]">
                Menu
              </span>
              <button
                type="button"
                onClick={closeDrawer}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-line px-2 text-[#174a45] transition hover:bg-surface-soft"
              >
                <span className="sr-only">Tutup menu</span>
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </svg>
              </button>
            </div>

            <nav aria-label="Navigasi utama (menu)" className="flex flex-col gap-1">
              {links.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeDrawer}
                  className="inline-flex min-h-11 items-center rounded-md px-2 text-[#435a53] transition hover:bg-surface-soft hover:text-[#174a45]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-5 border-t border-line pt-4">
              {user ? (
                <div className="space-y-3">
                  <p className="text-xs text-[#6b7771]">
                    {user.name} · {user.roleLabel}
                  </p>
                  <LogoutButton />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/login"
                    onClick={closeDrawer}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-5 py-2 text-sm font-medium text-[#174a45] transition hover:bg-surface-soft"
                  >
                    Masuk
                  </Link>
                  <Link
                    href="/register"
                    onClick={closeDrawer}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#174a45] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#103632]"
                  >
                    Daftar Kunjungan
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>,
        document.body,
      ) : null}
    </div>
  );
}
