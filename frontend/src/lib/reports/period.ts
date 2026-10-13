/**
 * Rentang tanggal laporan di sisi tampilan.
 *
 * Rentang dikirim sebagai tanggal kalender pada zona waktu venue, sama seperti
 * default backend. Perhitungan zona waktu sengaja tidak diserahkan pada jam
 * server (yang berjalan UTC) agar tanggal yang tampil sama dengan tanggal yang
 * dihitung backend.
 */

import type { ReportFilters } from "./types";

export const VENUE_TIMEZONE = "Asia/Jakarta";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/** Tanggal hari ini pada zona venue, dalam bentuk YYYY-MM-DD. */
export function venueToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VENUE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Default rentang: awal bulan berjalan sampai hari ini (zona venue). */
export function defaultPeriod(): { from: string; to: string } {
  const today = venueToday();

  return { from: `${today.slice(0, 7)}-01`, to: today };
}

const DATE_KEYS = ["date_from", "date_to"] as const;
const REPORT_KEYS = [
  "date_from",
  "date_to",
  "source",
  "status",
  "payment_status",
  "checked_in",
  "date_basis",
  "page",
  "per_page",
] as const;

function pick(params: SearchParams, keys: readonly string[]): ReportFilters {
  const filters: ReportFilters = {};

  for (const key of keys) {
    const value = first(params[key]).trim();

    if (value !== "") {
      filters[key as keyof ReportFilters] = value;
    }
  }

  return filters;
}

/** Filter tanggal untuk dashboard (hanya rentang). */
export function readDateFilters(params: SearchParams): ReportFilters {
  return pick(params, DATE_KEYS);
}

/** Filter lengkap untuk laporan. */
export function readReportFilters(params: SearchParams): ReportFilters {
  return pick(params, REPORT_KEYS);
}

/**
 * Isi tanggal yang belum diisi dengan default, lalu sertakan keduanya ke
 * backend supaya periode yang ditampilkan sama dengan periode yang dihitung.
 */
export function withResolvedPeriod(filters: ReportFilters): ReportFilters {
  const fallback = defaultPeriod();

  return {
    ...filters,
    date_from: filters.date_from ?? fallback.from,
    date_to: filters.date_to ?? fallback.to,
  };
}

/** Ubah filter menjadi query string (tanpa tanda tanya). */
export function toQueryString(filters: ReportFilters): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === "string" && value !== "") {
      params.set(key, value);
    }
  }

  return params.toString();
}
