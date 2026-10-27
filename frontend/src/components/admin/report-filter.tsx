"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { ReportFilters } from "@/lib/reports/types";

const INPUT_CLASS =
  "w-full min-w-0 rounded-md border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-ocean focus:ring-1 focus:ring-ocean";
const LABEL_CLASS = "block text-xs font-medium text-foreground";
const BUTTON_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-ocean px-5 py-2 text-sm font-semibold text-ivory transition-colors hover:bg-ocean-dark";
const RESET_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-line px-5 py-2 text-sm font-medium text-ocean transition hover:border-ocean/50 hover:bg-surface-soft";

export type FilterField =
  | "source"
  | "status"
  | "payment_status"
  | "checked_in"
  | "date_basis";

type Option = { value: string; label: string };

const OPTIONS: Record<FilterField, Option[]> = {
  source: [
    { value: "", label: "Semua sumber" },
    { value: "online", label: "Daring" },
    { value: "counter", label: "Loket" },
  ],
  status: [
    { value: "", label: "Semua status" },
    { value: "pending", label: "Menunggu Pembayaran" },
    { value: "paid", label: "Terbayar" },
    { value: "checked_in", label: "Sudah Check-in" },
    { value: "cancelled", label: "Dibatalkan" },
  ],
  payment_status: [
    { value: "", label: "Semua pembayaran" },
    { value: "pending", label: "Menunggu" },
    { value: "success", label: "Berhasil" },
    { value: "failed", label: "Gagal" },
  ],
  checked_in: [
    { value: "", label: "Semua" },
    { value: "true", label: "Sudah check-in" },
    { value: "false", label: "Belum check-in" },
  ],
  date_basis: [
    { value: "", label: "Tanggal transaksi (dibuat)" },
    { value: "visit_date", label: "Tanggal kunjungan" },
    { value: "paid_at", label: "Waktu pembayaran" },
  ],
};

const FIELD_LABELS: Record<FilterField, string> = {
  source: "Sumber",
  status: "Status transaksi",
  payment_status: "Status pembayaran",
  checked_in: "Kunjungan",
  date_basis: "Dasar tanggal",
};

function Select({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: Option[];
}) {
  return (
    <div>
      <label htmlFor={name} className={LABEL_CLASS}>
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={value}
        className={INPUT_CLASS}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Form filter laporan. Nilai dibaca dari FormData lalu didorong ke URL, sehingga
 * server component memuat ulang data dengan filter baru. Perhitungan tetap
 * dilakukan backend; halaman hanya meneruskan pilihan.
 */
export default function ReportFilter({
  basePath,
  initial,
  fields,
  paginated = false,
}: {
  basePath: string;
  initial: ReportFilters;
  fields: FilterField[];
  paginated?: boolean;
}) {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    for (const [key, raw] of data.entries()) {
      if (typeof raw !== "string") continue;

      const value = raw.trim();

      if (value !== "" && value !== "all") {
        params.set(key, value);
      }
    }

    const query = params.toString();
    router.push(query === "" ? basePath : `${basePath}?${query}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-line bg-surface p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label htmlFor="date_from" className={LABEL_CLASS}>
            Dari tanggal
          </label>
          <input
            id="date_from"
            name="date_from"
            type="date"
            defaultValue={initial.date_from ?? ""}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="date_to" className={LABEL_CLASS}>
            Sampai tanggal
          </label>
          <input
            id="date_to"
            name="date_to"
            type="date"
            defaultValue={initial.date_to ?? ""}
            className={INPUT_CLASS}
          />
        </div>

        {fields.map((field) => (
          <Select
            key={field}
            name={field}
            label={FIELD_LABELS[field]}
            value={initial[field] ?? ""}
            options={OPTIONS[field]}
          />
        ))}

        {paginated ? (
          <Select
            name="per_page"
            label="Baris per halaman"
            value={initial.per_page ?? "25"}
            options={[
              { value: "25", label: "25" },
              { value: "50", label: "50" },
              { value: "100", label: "100" },
            ]}
          />
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="submit" className={BUTTON_CLASS}>
          Terapkan
        </button>
        <button
          type="button"
          onClick={() => router.push(basePath)}
          className={RESET_CLASS}
        >
          Reset
        </button>
      </div>
    </form>
  );
}
