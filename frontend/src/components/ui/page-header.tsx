import type { ReactNode } from "react";
import { cn } from "./cn";

/*
 * Judul halaman operasional dan publik. Sebelumnya pola `text-2xl font-semibold`
 * diulang 30 kali dengan jarak dan ukuran yang berbeda-beda.
 */
export default function PageHeader({
  eyebrow,
  title,
  titleClassName,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  /* Hanya untuk kode transaksi yang perlu dibaca karakter per karakter. */
  titleClassName?: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-4",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={cn(
            "mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl",
            titleClassName,
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
