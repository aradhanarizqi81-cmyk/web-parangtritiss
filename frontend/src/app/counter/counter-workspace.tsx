"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Field from "@/components/field";
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { ValidationErrors } from "@/lib/api/types";
import { estimateCost, formatRupiah } from "@/lib/pricing/tariffs";
import type { TariffCatalog } from "@/lib/pricing/tariffs";
import type { CounterTransaction } from "@/lib/counter/types";

type VisitorRow = { full_name: string; nik: string };

const inputClass =
  "w-full min-w-0 rounded-md border border-line bg-surface px-3 py-2 text-base text-foreground outline-none transition focus:border-ocean focus:ring-1 focus:ring-ocean";

/**
 * Tanggal lokal hari ini (YYYY-MM-DD), tanpa terpengaruh UTC.
 */
function today(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export default function CounterWorkspace() {
  const router = useRouter();
  const [tariffs, setTariffs] = useState<TariffCatalog | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [visitDate, setVisitDate] = useState(today);
  const [visitors, setVisitors] = useState<VisitorRow[]>([
    { full_name: "", nik: "" },
  ]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;

    apiRequest<{ data: TariffCatalog }>("/api/counter/tariffs")
      .then((response) => {
        if (active) setTariffs(response.data);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(
          error instanceof ApiError
            ? error.message
            : "Gagal memuat tarif dari server.",
        );
      });

    return () => {
      active = false;
    };
  }, []);

  // Estimasi hanya untuk tampilan. Backend menghitung ulang total final.
  const filledVisitorCount = visitors.filter(
    (visitor) => visitor.full_name.trim() !== "" || visitor.nik.trim() !== "",
  ).length;

  const estimate = useMemo(
    () => estimateCost(tariffs, filledVisitorCount, quantities),
    [tariffs, filledVisitorCount, quantities],
  );

  function updateVisitor(index: number, key: keyof VisitorRow, value: string) {
    setVisitors((current) =>
      current.map((visitor, position) =>
        position === index ? { ...visitor, [key]: value } : visitor,
      ),
    );
  }

  function addVisitor() {
    setVisitors((current) => [...current, { full_name: "", nik: "" }]);
  }

  function removeVisitor(index: number) {
    setVisitors((current) =>
      current.length <= 1
        ? current
        : current.filter((_, position) => position !== index),
    );
  }

  function updateQuantity(vehicleTypeId: number, value: string) {
    const parsed = Number.parseInt(value, 10);
    setQuantities((current) => ({
      ...current,
      [vehicleTypeId]: Number.isNaN(parsed) ? 0 : Math.max(0, parsed),
    }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setFormError(null);

    const payload = {
      visit_date: visitDate,
      visitors: visitors.map((visitor) => ({
        full_name: visitor.full_name.trim(),
        nik: visitor.nik.trim(),
      })),
      vehicles: Object.entries(quantities)
        .map(([id, quantity]) => ({
          vehicle_type_id: Number(id),
          quantity,
        }))
        .filter((line) => line.quantity > 0),
      // Informasional saja; backend mengabaikan dan menghitung ulang.
      client_total_amount: estimate.total,
    };

    try {
      const response = await apiRequest<{ data: CounterTransaction }>(
        "/api/counter/transactions",
        payload,
      );

      router.push(`/counter/transactions/${response.data.id}`);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.errors ?? {});
        setFormError(error.errors ? null : error.message);
      } else {
        setFormError("Terjadi kesalahan yang tidak terduga.");
      }
      setPending(false);
    }
  }

  if (loadError) {
    return (
      <p
        role="alert"
        className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      >
        {loadError}
      </p>
    );
  }

  if (tariffs === null) {
    return <p className="text-sm text-muted">Memuat tarif…</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <section className="rounded-lg border border-line bg-surface p-4">
        <Field id="visit_date" label="Tanggal kunjungan" error={errors.visit_date?.[0]}>
          <input
            id="visit_date"
            name="visit_date"
            type="date"
            required
            min={today()}
            value={visitDate}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setVisitDate(event.target.value)
            }
            className={`${inputClass} sm:max-w-xs`}
          />
        </Field>
      </section>

      <section className="rounded-lg border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pengunjung</h2>
          <button
            type="button"
            onClick={addVisitor}
            className="inline-flex min-h-11 items-center rounded-md border border-line px-3 text-sm font-medium text-ocean transition hover:border-ocean/50 hover:bg-surface-soft"
          >
            Tambah pengunjung
          </button>
        </div>

        <p className="mt-1 text-xs text-muted">
          NIK wajib 16 angka. NIK disimpan terenkripsi dan tidak pernah masuk ke
          URL, barcode, atau log.
        </p>

        <ol className="mt-4 space-y-4">
          {visitors.map((visitor, index) => (
            <li
              key={index}
              className="grid gap-3 rounded-md border border-line p-3 sm:grid-cols-[1fr_1fr_auto]"
            >
              <Field
                id={`visitor-${index}-name`}
                label={`Nama pengunjung ${index + 1}`}
                error={errors[`visitors.${index}.full_name`]?.[0]}
              >
                <input
                  id={`visitor-${index}-name`}
                  type="text"
                  value={visitor.full_name}
                  onChange={(event) =>
                    updateVisitor(index, "full_name", event.target.value)
                  }
                  className={inputClass}
                />
              </Field>

              <Field
                id={`visitor-${index}-nik`}
                label="NIK"
                error={errors[`visitors.${index}.nik`]?.[0]}
              >
                <input
                  id={`visitor-${index}-nik`}
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  value={visitor.nik}
                  onChange={(event) =>
                    updateVisitor(index, "nik", event.target.value)
                  }
                  className={inputClass}
                />
              </Field>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => removeVisitor(index)}
                  disabled={visitors.length <= 1}
                  className="inline-flex min-h-11 items-center rounded-md border border-line px-3 text-sm font-medium text-[#8b5148] transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Hapus pengunjung ${index + 1}`}
                >
                  Hapus
                </button>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="text-lg font-semibold">Kendaraan</h2>
        <p className="mt-1 text-xs text-muted">
          Isi jumlah kendaraan yang masuk. Kosongkan bila tidak ada.
        </p>

        <div className="mt-4 space-y-3">
          {tariffs.vehicle_types.length === 0 ? (
            <p className="text-sm text-muted">
              Belum ada jenis kendaraan aktif.
            </p>
          ) : (
            tariffs.vehicle_types.map((type) => (
              <div
                key={type.id}
                className="flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {type.name}
                  </p>
                  <p className="text-xs text-muted">
                    {formatRupiah(type.unit_tariff)} per unit
                  </p>
                </div>
                <input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  aria-label={`Jumlah ${type.name}`}
                  value={quantities[type.id] ?? 0}
                  onChange={(event) =>
                    updateQuantity(type.id, event.target.value)
                  }
                  className="w-24 shrink-0 rounded-md border border-line bg-surface px-3 py-2 text-right text-foreground outline-none transition focus:border-ocean focus:ring-1 focus:ring-ocean"
                />
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="text-lg font-semibold">Ringkasan biaya</h2>
        <p className="mt-1 text-xs text-muted">
          Total di bawah hanya perkiraan; nilai final dihitung backend dari tarif
          aktif.
        </p>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>
              Wisatawan ({estimate.visitorCount} ×{" "}
              {formatRupiah(estimate.visitorUnitTariff)})
            </dt>
            <dd className="tabular-nums">
              {formatRupiah(estimate.visitorTotal)}
            </dd>
          </div>

          {estimate.vehicleLines.map((line) => {
            const type = tariffs.vehicle_types.find(
              (candidate) => candidate.id === line.vehicleTypeId,
            );

            return (
              <div key={line.vehicleTypeId} className="flex justify-between">
                <dt>
                  {type?.name ?? "Kendaraan"} ({line.quantity} ×{" "}
                  {formatRupiah(line.unitTariff)})
                </dt>
                <dd className="tabular-nums">{formatRupiah(line.subtotal)}</dd>
              </div>
            );
          })}

          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatRupiah(estimate.total)}</dd>
          </div>
        </dl>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-ocean px-5 py-2.5 font-semibold text-ivory transition-colors hover:bg-ocean-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : "Buat transaksi loket"}
        </button>
        <p className="self-center text-xs text-muted">
          Transaksi dibuat dengan status belum lunas. Konfirmasi uang tunai
          dilakukan pada halaman detail.
        </p>
      </div>

      {/* Error umum ditampilkan di dekat tombol submit agar terlihat tanpa
          perlu menggulir ke atas form yang panjang. Error per-field tetap
          muncul di bawah kolomnya masing-masing. */}
      {formError ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {formError}
        </p>
      ) : null}
    </form>
  );
}
