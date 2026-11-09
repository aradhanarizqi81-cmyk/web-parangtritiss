import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/api/config";

/**
 * Optimistic auth gate. Proxy runs before the route renders, so it can return
 * a real redirect for anonymous users instead of letting the page stream a
 * client-side redirect.
 *
 * Pemeriksaan di sini HANYA keberadaan cookie (murah dan aman dijalankan di
 * setiap request). Otorisasi sebenarnya tetap di backend: halaman /profile
 * memvalidasi token ke Laravel lewat getCurrentUser().
 *
 * `x-pathname` diteruskan ke server component supaya header/footer bisa memilih
 * chrome yang tepat (publik, auth, atau portal) tanpa membaca header internal
 * Next.js yang tidak terdokumentasi.
 */
const PROTECTED_PATHS = [
  "/profile",
  "/counter",
  "/booking",
  "/gate",
  "/admin",
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isProtected(pathname) && !request.cookies.get(SESSION_COOKIE_NAME)) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}
