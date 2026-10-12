/**
 * Pemeriksaan origin sederhana untuk route handler yang mengubah state.
 *
 * Cookie sesi dikirim otomatis oleh browser, jadi permintaan lintas situs
 * (CSRF) harus ditolak. Permintaan tanpa header Origin (mis. curl, atau
 * request server-ke-server) diizinkan karena bukan berasal dari browser.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");

  if (!origin) return true;

  const host = request.headers.get("host");

  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
