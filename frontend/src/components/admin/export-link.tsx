/**
 * Tautan unduh CSV. Menunjuk ke route handler BFF same-origin (bukan Laravel
 * langsung) supaya token sesi HttpOnly tetap tidak terlihat oleh browser.
 */
export default function ExportLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
    >
      Unduh CSV
    </a>
  );
}
