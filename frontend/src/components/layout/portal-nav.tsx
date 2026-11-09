"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type PortalLink = { href: string; label: string };

export default function PortalNav({ links }: { links: PortalLink[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi portal"
      className="-mx-1 flex max-w-full items-center gap-1 overflow-x-auto px-1 py-1 text-sm"
    >
      {links.map((link) => {
        const active =
          pathname === link.href ||
          (link.href !== "/counter" && pathname.startsWith(`${link.href}/`));

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "inline-flex min-h-9 items-center whitespace-nowrap rounded-lg bg-ivory px-3 font-semibold text-ocean"
                : "inline-flex min-h-9 items-center whitespace-nowrap rounded-lg px-3 text-ivory/80 transition-colors hover:bg-ivory/10 hover:text-ivory"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
