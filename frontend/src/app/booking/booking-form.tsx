
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
import type { BookingTransaction } from "@/lib/booking/types";
import { estimateCost, formatRupiah } from "@/lib/pricing/tariffs";
import type { TariffCatalog } from "@/lib/pricing/tariffs";

type VisitorRow = { full_name: string; nik: string };

const inputClass =
  "w-full min-w-0 rounded-lg border border-[#dcded5] bg-[#fffefa] px-3.5 py-3 text-sm text-[#183b38] outline-none transition placeholder:text-[#969d94] focus:border-[#174a45] focus:ring-4 focus:ring-[#174a45]/10 disabled:cursor-not-allowed disabled:opacity-60";

const buttonSecondaryClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#dcded5] bg-white px-4 py-2 text-sm font-medium text-[#174a45] transition hover:border-[#174a45]/50 hover:bg-[#f3f0e7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#174a45] disabled:cursor-not-allowed disabled:opacity-40";

const errorClass =
  "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700";

function today(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function SectionHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f0ece2] font-serif text-sm text-[#174a45]">
        {number}
      </span>
      <div className="min-w-0 pt-0.5">
        <h2 className="text-lg font-semibold tracking-tight text-[#183b38]">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-[#6b7771]">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function BookingForm() {
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
  // Nilai berubah untuk menjalankan ulang efek pemuatan tarif (tombol coba lagi).
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    apiRequest<{ data: TariffCatalog }>("/api/booking/tariffs")
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
  }, [reloadKey]);

  const filledVisitorCount = visitors.filter(
    (visitor) =>
      visitor.full_name.trim() !== "" || visitor.nik.trim() !== "",
  ).length;

  const estimate = useMemo(
    () => estimateCost(tariffs, filledVisitorCount, quantities),
    [tariffs, filledVisitorCount, quantities],
  );

  function updateVisitor(
    index: number,
    key: keyof VisitorRow,
    value: string,
  ) {
    const safeValue =
      key === "nik" ? value.replace(/\D/g, "").slice(0, 16) : value;

    setVisitors((current) =>
      current.map((visitor, position) =>
        position === index
          ? { ...visitor, [key]: safeValue }
          : visitor,
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

    // Geser kunci error pengunjung ke bawah agar tetap menempel pada orang yang
    // benar setelah baris dihapus (tanpa ini, error baris lama pindah orang).
    setErrors((current) => {
      const next: ValidationErrors = {};

      for (const [key, value] of Object.entries(current)) {
        const match = /^visitors\.(\d+)\.(.+)$/.exec(key);

        if (!match) {
          next[key] = value;
          continue;
        }

        const position = Number(match[1]);
        if (position === index) continue;

        const shifted = position > index ? position - 1 : position;
        next[`visitors.${shifted}.${match[2]}`] = value;
      }

      return next;
    });
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

    if (pending) return;

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
      client_total_amount: estimate.total,
    };

    try {
      const response = await apiRequest<{ data: BookingTransaction }>(
        "/api/bookings",
        payload,
      );

      router.push(`/booking/${response.data.id}`);
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
      <div className="space-y-4">
        <div className={errorClass} role="alert">
          <p className="font-semibold">Tarif belum dapat dimuat</p>
          <p className="mt-1">{loadError}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoadError(null);
            setReloadKey((key) => key + 1);
          }}
          className={buttonSecondaryClass}
        >
          Coba muat ulang tarif
        </button>
      </div>
    );
  }

  if (tariffs === null) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl border border-[#e4e1d7] bg-white p-5"
        role="status"
      >
        <span
          className="size-5 animate-spin rounded-full border-2 border-[#dcded5] border-t-[#174a45] motion-reduce:animate-none"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-medium text-[#183b38]">
            Menyiapkan formulir booking
          </p>
          <p className="mt-1 text-xs text-[#6b7771]">
            Sedang mengambil tarif terbaru dari server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {formError && (
        <div className={errorClass} role="alert">
          <p className="font-semibold">Booking belum berhasil dibuat</p>
          <p className="mt-1">{formError}</p>
        </div>
      )}

      {Object.keys(errors).length > 0 && (
        <div className={errorClass} role="alert">
          <p className="font-semibold">Periksa kembali data formulir.</p>
          <p className="mt-1">
            Ada data yang belum sesuai. Lihat keterangan pada kolom yang
            ditandai, kemudian coba kembali.
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-[#e4e1d7] bg-white p-5 shadow-[0_4px_24px_rgba(24,59,56,0.025)] sm:p-7">
        <SectionHeading
          number="01"
          title="Tanggal kunjungan"
          description="Pilih tanggal yang direncanakan untuk mengunjungi pantai."
        />

        <div className="mt-6">
          <Field
            id="visit_date"
            label="Tanggal kedatangan"
            hint="Pilih tanggal hari ini hingga 30 hari ke depan."
            error={errors.visit_date?.[0]}
          >
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
              className={`${inputClass} sm:max-w-sm`}
              aria-invalid={Boolean(errors.visit_date?.[0])}
              aria-describedby={
                errors.visit_date?.[0] ? "visit_date-error" : undefined
              }
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-[#e4e1d7] bg-white p-5 shadow-[0_4px_24px_rgba(24,59,56,0.025)] sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeading
            number="02"
            title="Data pengunjung"
            description="Masukkan identitas setiap orang yang akan berkunjung."
          />

          <button
            type="button"
            onClick={addVisitor}
            className={buttonSecondaryClass}
          >
            <span aria-hidden="true" className="text-lg leading-none">
              +
            </span>
            Tambah pengunjung
          </button>
        </div>

        <div className="mt-5 rounded-lg border border-[#e9d8b8] bg-[#faf8f2] px-4 py-3">
          <p className="text-xs leading-5 text-[#53645d]">
            NIK harus terdiri dari 16 angka. Masukkan data sesuai identitas
            masing-masing pengunjung. Informasi sensitif tidak ditampilkan
            pada URL atau barcode.
          </p>
        </div>

        <ol className="mt-5 space-y-4">
          {visitors.map((visitor, index) => {
            const nameError = errors[`visitors.${index}.full_name`]?.[0];
            const nikError = errors[`visitors.${index}.nik`]?.[0];

            return (
              <li
                key={index}
                className="rounded-xl border border-[#e4e1d7] bg-[#fffefa] p-4 sm:p-5"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-full bg-[#f0ece2] text-xs font-semibold text-[#174a45]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-sm font-semibold text-[#183b38]">
                      Pengunjung {index + 1}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeVisitor(index)}
                    disabled={visitors.length <= 1 || pending}
                    className="rounded-full px-3 py-2 text-xs font-medium text-[#8b5148] transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label={`Hapus pengunjung ${index + 1}`}
                  >
                    Hapus
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id={`visitor-${index}-name`}
                    label="Nama lengkap"
                    error={nameError}
                  >
                    <input
                      id={`visitor-${index}-name`}
                      name={`visitors[${index}][full_name]`}
                      type="text"
                      autoComplete="name"
                      required
                      maxLength={255}
                      value={visitor.full_name}
                      onChange={(event) =>
                        updateVisitor(index, "full_name", event.target.value)
                      }
                      className={inputClass}
                      placeholder="Nama sesuai identitas"
                      aria-invalid={Boolean(nameError)}
                    />
                  </Field>

                  <Field
                    id={`visitor-${index}-nik`}
                    label="NIK"
                    hint={`${visitor.nik.length}/16 angka`}
                    error={nikError}
                  >
                    <input
                      id={`visitor-${index}-nik`}
                      name={`visitors[${index}][nik]`}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      required
                      maxLength={16}
                      pattern="[0-9]{16}"
                      value={visitor.nik}
                      onChange={(event) =>
                        updateVisitor(index, "nik", event.target.value)
                      }
                      className={inputClass}
                      placeholder="Masukkan 16 digit NIK"
                      aria-invalid={Boolean(nikError)}
                    />
                  </Field>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-5 flex items-center justify-between border-t border-[#e4e1d7] pt-4">
          <p className="text-xs text-[#6b7771]">Jumlah pengunjung</p>
          <p className="text-sm font-semibold text-[#183b38]">
            {visitors.length} orang
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-[#e4e1d7] bg-white p-5 shadow-[0_4px_24px_rgba(24,59,56,0.025)] sm:p-7">
        <SectionHeading
          number="03"
          title="Kendaraan"
          description="Tambahkan kendaraan yang digunakan selama kunjungan."
        />

        <div className="mt-6 divide-y divide-[#e4e1d7]">
          {tariffs.vehicle_types.length === 0 ? (
            <p className="py-4 text-sm text-[#6b7771]">
              Belum ada jenis kendaraan aktif.
            </p>
          ) : (
            tariffs.vehicle_types.map((type) => (
              <div
                key={type.id}
                className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f3f0e7] text-[#174a45]"
                    aria-hidden="true"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 17h14l1-5-2-5H6l-2 5 1 5Z" />
                      <path d="M4 12h16M7 17v2m10-2v2M7 7l1-3h8l1 3" />
                      <circle cx="7" cy="14" r="1" />
                      <circle cx="17" cy="14" r="1" />
                    </svg>
                  </span>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#183b38]">
                      {type.name}
                    </p>
                    <p className="mt-1 text-xs text-[#6b7771]">
                      {formatRupiah(type.unit_tariff)} per unit
                    </p>
                  </div>
                </div>

                <div className="w-24 shrink-0">
                  <label
                    className="sr-only"
                    htmlFor={`vehicle-${type.id}`}
                  >
                    Jumlah {type.name}
                  </label>
                  <input
                    id={`vehicle-${type.id}`}
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={quantities[type.id] ?? 0}
                    onChange={(event) =>
                      updateQuantity(type.id, event.target.value)
                    }
                    disabled={pending}
                    className={`${inputClass} text-right tabular-nums`}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <p className="mt-5 text-xs leading-5 text-[#6b7771]">
          Tarif kendaraan mengikuti daftar tarif aktif yang diterima dari
          server. Biarkan jumlah nol jika tidak membawa kendaraan.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#103632] bg-[#174a45] text-white shadow-[0_8px_32px_rgba(16,54,50,0.10)]">
        <div className="p-5 sm:p-7">
          <SectionHeading
            number="04"
            title="Ringkasan biaya"
            description="Periksa estimasi biaya sebelum membuat booking."
          />

          <dl className="mt-7 space-y-4">
            <div className="flex items-start justify-between gap-4 text-sm">
              <dt className="min-w-0 text-white/75">
                Wisatawan
                <span className="mt-1 block text-xs text-white/50">
                  {estimate.visitorCount} ×{" "}
                  {formatRupiah(estimate.visitorUnitTariff)}
                </span>
              </dt>
              <dd className="shrink-0 text-right tabular-nums">
                {formatRupiah(estimate.visitorTotal)}
              </dd>
            </div>

            {estimate.vehicleLines.map((line) => {
              const type = tariffs.vehicle_types.find(
                (candidate) => candidate.id === line.vehicleTypeId,
              );

              return (
                <div
                  key={line.vehicleTypeId}
                  className="flex items-start justify-between gap-4 text-sm"
                >
                  <dt className="min-w-0 text-white/75">
                    {type?.name ?? "Kendaraan"}
                    <span className="mt-1 block text-xs text-white/50">
                      {line.quantity} × {formatRupiah(line.unitTariff)}
                    </span>
                  </dt>
                  <dd className="shrink-0 text-right tabular-nums">
                    {formatRupiah(line.subtotal)}
                  </dd>
                </div>
              );
            })}
          </dl>

          <div className="mt-6 border-t border-white/20 pt-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-white/75">Estimasi total</p>
                <p className="mt-1 text-xs text-white/50">
                  Nilai final dihitung oleh server
                </p>
              </div>
              <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                {formatRupiah(estimate.total)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#103632] px-5 py-4 sm:px-7">
          <p className="text-xs leading-6 text-white/70">
            Pembuatan booking belum berarti pembayaran selesai. Ikuti status
            transaksi pada halaman detail untuk melanjutkan pembayaran
            simulasi dan penerbitan tiket.
          </p>
        </div>
      </section>

      <div className="rounded-2xl border border-[#e4e1d7] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-md">
            <h2 className="font-semibold text-[#183b38]">
              Siap membuat booking?
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#6b7771]">
              Pastikan data pengunjung dan tanggal kunjungan sudah benar
              sebelum melanjutkan.
            </p>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-full bg-[#174a45] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#103632] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#174a45] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (
              <>
                <span
                  className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
                  aria-hidden="true"
                />
                Memproses booking…
              </>
            ) : (
              <>
                Buat booking
                <span aria-hidden="true">↗</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
