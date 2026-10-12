import { laravelFetch } from "@/lib/api/server";
import type { User } from "@/lib/api/types";
import { getSessionToken } from "@/lib/auth/session";

/**
 * Mengambil pengguna terautentikasi dari Laravel. Mengembalikan null bila
 * tidak ada cookie sesi atau token ditolak (401) — pemanggil yang memutuskan
 * untuk mengalihkan ke halaman login.
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = await getSessionToken();

  if (!token) return null;

  const result = await laravelFetch<{ data: User }>("/api/v1/auth/me", {
    token,
  });

  if (!result.ok) return null;

  return result.data.data;
}
