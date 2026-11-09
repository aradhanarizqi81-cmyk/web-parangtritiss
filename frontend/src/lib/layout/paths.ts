const PORTAL_ROOTS = ["/counter", "/gate", "/admin"];
const AUTH_ROOTS = ["/login", "/register"];

function matches(pathname: string, roots: string[]): boolean {
  return roots.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  );
}

/**
 * Area kerja petugas memakai chrome sendiri. Portal tidak menampilkan navigasi
 * wisatawan karena tugas di dalamnya berbeda dan setiap item tambahan
 * memperlambat pemindaian.
 */
export function isPortalPath(pathname: string): boolean {
  return matches(pathname, PORTAL_ROOTS) || pathname.startsWith("/staff");
}

/**
 * Halaman masuk dan daftar fokus pada satu keputusan. Header wisatawan dilepas
 * agar tidak ada dua jalur navigasi yang bersaing di layar yang sama.
 */
export function isAuthPath(pathname: string): boolean {
  return matches(pathname, AUTH_ROOTS);
}

export function isChromelessPath(pathname: string): boolean {
  return isPortalPath(pathname) || isAuthPath(pathname);
}
