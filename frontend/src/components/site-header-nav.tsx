"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import LogoutButton from "@/components/logout-button";

type NavLink = { href: string; label: string };
type NavAction = { href: string; label: string };
type Tone = "transparent" | "solid";

const DRAWER_ID = "site-header-drawer";
const PROFILE_MENU_ID = "site-header-profile-menu";

export default function SiteHeaderNav({
  links,
  accountLinks,
  actions,
  user,
  tone = "solid",
  activePath = "/",
}: {
  links: NavLink[];
  accountLinks: NavLink[];
  actions: NavAction[];
  user: { name: string; role: string } | null;
  tone?: Tone;
  activePath: string;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const profileWrapRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const navbarRef = useRef<HTMLElement>(null);

  // Tandai navbar yang sudah digulir agar latarnya lebih pekat.
  useEffect(() => {
    const navbar = navbarRef.current;
    if (!navbar) return;

    const updateScrolled = () => {
      navbar.setAttribute("data-scrolled", String(window.scrollY > 24));
    };
    updateScrolled();

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        updateScrolled();
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Menu tidak boleh tetap terbuka setelah pindah halaman. Reset saat render
  // ketika pathname berubah, bukan lewat efek yang memicu render tambahan.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
    setProfileOpen(false);
  }

  useEffect(() => {
    const closeProfile = () => setProfileOpen(false);
    window.addEventListener("hashchange", closeProfile);
    return () => window.removeEventListener("hashchange", closeProfile);
  }, []);

  // Pindahkan fokus ke dalam laci saat dibuka.
  useEffect(() => {
    if (menuOpen) drawerRef.current?.focus();
  }, [menuOpen]);

  // Tutup menu dengan Escape dan kembalikan fokus ke tombol pemicunya.
  useEffect(() => {
    if (!menuOpen && !profileOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      if (menuOpen) {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }

      if (profileOpen) {
        setProfileOpen(false);
        profileButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, profileOpen]);

  // Kunci gulir latar selama laci terbuka, dan tutup bila viewport melebar.
  useEffect(() => {
    if (!menuOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const desktop = window.matchMedia("(min-width: 768px)");
    function onChange(event: MediaQueryListEvent) {
      if (event.matches) setMenuOpen(false);
    }
    desktop.addEventListener("change", onChange);

    return () => {
      document.body.style.overflow = previous;
      desktop.removeEventListener("change", onChange);
    };
  }, [menuOpen]);

  // Klik di luar dropdown profil menutupnya.
  useEffect(() => {
    if (!profileOpen) return;

    function onPointerDown(event: PointerEvent) {
      if (!profileWrapRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [profileOpen]);

  function closeDrawer() {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  }

  function isLinkActive(href: string) {
    if (href === "/") return activePath === "/" || activePath === "";
    return activePath.startsWith(href);
  }

  return (
    <header className="site-nav-wrap">
      <nav
        ref={navbarRef}
        className="site-nav"
        data-variant={tone}
        aria-label="Navigasi utama"
      >
        <Link
          href="/"
          aria-label="Parangtritis, kembali ke beranda"
          className="site-logo"
        >
          Parangtritis
        </Link>

        {/* Navigasi horizontal: hanya tampil mulai breakpoint md. */}
        <ul className="site-nav-links">
          {links.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isLinkActive(item.href) ? "page" : undefined}
                className={`site-nav-link${isLinkActive(item.href) ? " site-nav-link-active" : ""}`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Aksi akun: hanya tampil mulai breakpoint md. */}
        {user ? (
          <div className="site-nav-actions">
            <div className="site-nav-user" ref={profileWrapRef}>
              <button
                type="button"
                ref={profileButtonRef}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                aria-controls={PROFILE_MENU_ID}
                aria-label={`Menu akun ${user.name}`}
                className="site-nav-menu-btn"
                onClick={() => setProfileOpen((value) => !value)}
              >
                {user.name?.charAt(0).toUpperCase() || "U"}
              </button>

              {profileOpen ? (
                <div
                  id={PROFILE_MENU_ID}
                  className="site-nav-dropdown"
                  role="menu"
                  aria-label="Menu akun"
                >
                  {accountLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      className="site-nav-dropdown-item"
                      onClick={() => setProfileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  {accountLinks.length > 0 ? (
                    <div
                      className="site-nav-dropdown-divider"
                      aria-hidden="true"
                    />
                  ) : null}
                  <LogoutButton variant="menu" />
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="site-nav-actions">
            {actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={`site-nav-action${
                  action.href === "/register"
                    ? " site-nav-action-primary"
                    : " site-nav-action-secondary"
                }`}
              >
                {action.label}
              </Link>
            ))}
          </div>
        )}

        <button
          type="button"
          ref={menuButtonRef}
          aria-expanded={menuOpen}
          aria-controls={DRAWER_ID}
          aria-label={menuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
          className="site-nav-menu-toggle"
          onClick={() => setMenuOpen((value) => !value)}
        >
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
            {menuOpen ? (
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
      </nav>

      {/*
       * Laci mobile dirender lewat portal ke body. Header memakai
       * `backdrop-filter`, dan properti itu menciptakan containing block baru
       * untuk elemen fixed, sehingga panel tanpa portal akan terpotong.
       */}
      {menuOpen && typeof document !== "undefined"
        ? createPortal(
            <>
              <div
                className="fixed inset-0 z-[60] bg-ocean-950/45 md:hidden"
                aria-hidden="true"
                onClick={closeDrawer}
              />

              <div
                id={DRAWER_ID}
                ref={drawerRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label="Menu navigasi"
                className="fixed inset-y-0 right-0 z-[70] flex w-80 max-w-[85vw] flex-col overflow-y-auto border-l border-line bg-white p-5 text-foreground outline-none md:hidden"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-semibold tracking-wide">
                    Menu
                  </span>
                  <button
                    type="button"
                    onClick={closeDrawer}
                    aria-label="Tutup menu"
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-line px-2 text-ocean transition-colors hover:bg-surface-soft"
                  >
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

                <nav
                  aria-label="Navigasi utama (menu)"
                  className="flex flex-col gap-1"
                >
                  {links.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={
                        isLinkActive(item.href) ? "page" : undefined
                      }
                      onClick={closeDrawer}
                      className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-soft hover:text-ocean"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                <div className="mt-auto border-t border-line pt-4">
                  {user ? (
                    <LogoutButton className="w-full justify-center" />
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Link
                        href="/login"
                        onClick={closeDrawer}
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-5 text-sm font-medium text-ocean transition-colors hover:bg-surface-soft"
                      >
                        Masuk
                      </Link>
                      <Link
                        href="/register"
                        onClick={closeDrawer}
                        className="inline-flex min-h-11 items-center justify-center rounded-full bg-ocean px-5 text-sm font-semibold text-ivory transition-colors hover:bg-ocean-dark"
                      >
                        Daftar kunjungan
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </header>
  );
}
