import Link from "next/link";
import type { PageMeta } from "@/lib/reports/types";

const LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-full border border-line px-4 text-ocean transition hover:bg-surface-soft";
const DISABLED_CLASS =
  "inline-flex min-h-11 items-center rounded-full border border-line px-4 text-muted opacity-60";

export default function Pagination({
  meta,
  basePath,
  query,
}: {
  meta: PageMeta;
  basePath: string;
  query: string;
}) {
  if (meta.last_page <= 1) return null;

  const pageHref = (page: number): string => {
    const params = new URLSearchParams(query);
    params.set("page", String(page));
    return `${basePath}?${params.toString()}`;
  };

  const hasPrev = meta.current_page > 1;
  const hasNext = meta.current_page < meta.last_page;

  return (
    <nav
      aria-label="Navigasi halaman"
      className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <span className="text-muted">
        Halaman {meta.current_page} dari {meta.last_page} · {meta.total} baris
      </span>
      <div className="flex gap-2">
        {hasPrev ? (
          <Link href={pageHref(meta.current_page - 1)} className={LINK_CLASS}>
            Sebelumnya
          </Link>
        ) : (
          <span aria-disabled="true" className={DISABLED_CLASS}>
            Sebelumnya
          </span>
        )}
        {hasNext ? (
          <Link href={pageHref(meta.current_page + 1)} className={LINK_CLASS}>
            Berikutnya
          </Link>
        ) : (
          <span aria-disabled="true" className={DISABLED_CLASS}>
            Berikutnya
          </span>
        )}
      </div>
    </nav>
  );
}
