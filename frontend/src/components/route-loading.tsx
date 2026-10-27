/**
 * Skeleton umum untuk state memuat (loading.tsx). Warna memakai token tema
 * yang sudah ada; animasi dihormati oleh aturan prefers-reduced-motion di
 * globals.css sehingga aman dipakai di semua halaman.
 */
export default function RouteLoading({ label = "Memuat" }: { label?: string }) {
  return (
    <div className="space-y-4 animate-pulse" role="status" aria-live="polite">
      <span className="sr-only">{label}…</span>

      <div className="space-y-2">
        <div className="h-7 w-48 rounded-md bg-surface-soft" />
        <div className="h-4 w-72 max-w-full rounded-md bg-surface-soft" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-20 rounded-lg border border-line bg-surface" />
        <div className="h-20 rounded-lg border border-line bg-surface" />
        <div className="h-20 rounded-lg border border-line bg-surface" />
        <div className="h-20 rounded-lg border border-line bg-surface" />
      </div>

      <div className="h-40 rounded-lg border border-line bg-surface" />
    </div>
  );
}
