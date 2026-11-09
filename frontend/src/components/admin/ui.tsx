import type { ReactNode } from "react";
import Alert from "@/components/ui/alert";
import Card from "@/components/ui/card";

/*
 * Komponen khusus laporan. Bentuk kartu dan peringatan diambil dari `ui/`
 * supaya radius, garis, dan warna status laporan sama dengan halaman lain;
 * yang tersisa di sini hanya susunan khas metrik dan baris kosong tabel.
 */
export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Card className="p-4 sm:p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}

export function ErrorNotice({ message }: { message: string }) {
  return <Alert tone="danger">{message}</Alert>;
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-6 text-center text-sm text-muted">
        {children}
      </td>
    </tr>
  );
}
