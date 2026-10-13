import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import { getCurrentUser } from "@/lib/auth/guard";
import {
  canUseBooking,
  canUseCounter,
  canUseGate,
  roleLabel,
} from "@/lib/auth/roles";

export default async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-neutral-200 bg-white print:hidden">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-semibold text-neutral-900">
          Pantai Parangtritis
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              {canUseCounter(user.role) ? (
                <Link
                  href="/counter"
                  className="text-neutral-700 hover:text-neutral-900"
                >
                  Loket
                </Link>
              ) : null}
              {canUseGate(user.role) ? (
                <Link
                  href="/gate"
                  className="text-neutral-700 hover:text-neutral-900"
                >
                  Gerbang
                </Link>
              ) : null}
              {canUseBooking(user.role) ? (
                <Link
                  href="/booking"
                  className="text-neutral-700 hover:text-neutral-900"
                >
                  Booking
                </Link>
              ) : null}
              <Link
                href="/profile"
                className="text-neutral-700 hover:text-neutral-900"
              >
                Profil
              </Link>
              <span className="hidden text-neutral-500 sm:inline">
                {user.name} · {roleLabel(user.role)}
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-neutral-700 hover:text-neutral-900"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-emerald-700 px-3 py-1.5 font-medium text-white hover:bg-emerald-800"
              >
                Daftar
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
