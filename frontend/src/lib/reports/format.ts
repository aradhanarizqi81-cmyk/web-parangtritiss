/**
 * Pemformatan tampilan laporan. Waktu ditampilkan pada zona venue agar tidak
 * bergantung pada zona waktu jam server.
 */

import { VENUE_TIMEZONE } from "./period";

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function formatDateTime(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: VENUE_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDate(value: string | null): string {
  return value ?? "—";
}
