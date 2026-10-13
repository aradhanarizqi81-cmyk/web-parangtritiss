import Link from "next/link";
import type { PageMeta } from "@/lib/reports/types";

const LINK_CLASS =
  "rounded-md border border-neutral-300 px-3 py-1.5 text-neutral-700 hover:bg-neutral-50";
const DISABLED_CLASS =
  "rounded-md border border-neutral-200 px-3 py-1.5 text-neutral-400";

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
      className="mt-4 flex items-center justify-between gap-3 text-sm"
    >
      <span className="text-neutral-500">
        Halaman {meta.current_page} dari {meta.last_page} · {meta.total} baris
      </span>
      <div className="flex gap-2">
        {hasPrev ? (
          <Link href={pageHref(meta.current_page - 1)} className={LINK_CLASS}>
            Sebelumnya
          </Link>
        ) : (
          <span className={DISABLED_CLASS}>Sebelumnya</span>
        )}
        {hasNext ? (
          <Link href={pageHref(meta.current_page + 1)} className={LINK_CLASS}>
            Berikutnya
          </Link>
        ) : (
          <span className={DISABLED_CLASS}>Berikutnya</span>
        )}
      </div>
    </nav>
  );
}
