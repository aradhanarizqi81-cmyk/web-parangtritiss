import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_SECURE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/api/config";

/**
 * Keputusan penyimpanan token (lihat docs/SECURITY.md):
 * token Sanctum disimpan pada cookie HttpOnly dan hanya disentuh oleh kode
 * server (route handler / server component). JavaScript di browser tidak
 * pernah dapat membaca token, sehingga XSS tidak dapat mencurinya.
 *
 * Karena itu semua fungsi di modul ini WAJIB hanya dipanggil dari sisi server.
 */

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function setSessionToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: SESSION_COOKIE_SECURE,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionToken(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}
