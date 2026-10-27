"use client";

import { useRef, useState, type FormEvent } from "react";
import Field from "@/components/field";
import StatusBadge from "@/components/counter/status-badge";
import WristbandCard from "@/components/counter/wristband-card";
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  hasPrintedTickets,
  redemptionTone,
  wristbandButtonLabel,
  type RedemptionTone,
} from "@/lib/counter/redemption";
import type { RedemptionTransaction } from "@/lib/counter/types";
import { formatRupiah } from "@/lib/pricing/tariffs";

type Pending = "lookup" | "confirm" | "print" | null;

const inputClass =
  "w-full min-w-0 rounded-md border border-line bg-surface px-3 py-2 font-mono text-foreground outline-none transition focus:border-ocean focus:ring-1 focus:ring-ocean";

const TONE_STYLES: Record<RedemptionTone, string> = {
  redeemable: "border-amber-300 bg-amber-50 text-amber-900",
  redeemed: "border-emerald-300 bg-emerald-50 text-emerald-900",
  blocked: "border-red-300 bg-red-50 text-red-700",
};

function formatRedeemedAt(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Meja penukaran tiket fisik di loket.
 *
 * Alurnya: pindai/ketik kode penukaran → pratinjau pesanan (hanya baca) →
 * konfirmasi penukaran → cetak gelang. Kode penukaran tidak pernah masuk ke
 * URL; barcode identitas tiket individual pada gelang terpisah dari check-in.
 *
 * Prinsipnya: memindai atau membuka pratinjau TIDAK menandai booking sebagai
 * sudah ditukarkan. Backend tetap sumber kebenaran (422 bila belum lunas, 409
 * bila sudah ditukarkan, dengan penguncian baris).
 */
export default function RedemptionWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [scannedToken, setScannedToken] = useState<string | null>(null);
  const [preview, setPreview] = useState<RedemptionTransaction | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function focusInput() {
    inputRef.current?.focus();
    inputRef.current?.select();
  }

  async function onLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const entered = code.trim();
    if (entered === "") {
      focusInput();
      return;
    }

    setPending("lookup");
    setError(null);
    setInfo(null);

    try {
      const response = await apiRequest<{ data: RedemptionTransaction }>(
        "/api/counter/redemptions/lookup",
        { redemption_token: entered },
      );

      setPreview(response.data);
      setScannedToken(entered);
      // Kosongkan agar pindai berikutnya tidak menempel pada kode lama.
      setCode("");
    } catch (caught) {
      setPreview(null);
      setScannedToken(null);
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Terjadi kesalahan yang tidak terduga.",
      );
    } finally {
      setPending(null);
      focusInput();
    }
  }

  async function onConfirm() {
    if (!scannedToken) return;

    setPending("confirm");
    setError(null);
    setInfo(null);

    try {
      const response = await apiRequest<{
        message: string;
        data: RedemptionTransaction;
      }>("/api/counter/redemptions/confirm", {
        redemption_token: scannedToken,
      });

      setPreview(response.data);
      setInfo(response.message);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Terjadi kesalahan yang tidak terduga.",
      );
      // Segarkan pratinjau agar status can_redeem/redeemed mencerminkan
      // kebenaran backend (mis. 409 sudah ditukarkan petugas lain), sehingga
      // tombol konfirmasi tidak tetap aktif untuk aksi yang mustahil.
      await refreshPreview(scannedToken);
    } finally {
      setPending(null);
    }
  }

  /** Ambil ulang pratinjau tanpa mengubah status pending utama. */
  async function refreshPreview(token: string) {
    try {
      const response = await apiRequest<{ data: RedemptionTransaction }>(
        "/api/counter/redemptions/lookup",
        { redemption_token: token },
      );
      setPreview(response.data);
    } catch {
      // Jika lookup ulang gagal, biarkan pesan error konfirmasi yang tampil.
    }
  }

  async function onPrint() {
    if (!scannedToken) return;

    setPending("print");
    setError(null);
    setInfo(null);

    try {
      const response = await apiRequest<{
        message: string;
        data: RedemptionTransaction;
      }>("/api/counter/redemptions/print", {
        redemption_token: scannedToken,
      });

      setPreview(response.data);
      setInfo(response.message);
      // Gelang sudah berada di DOM sebelum dialog cetak dibuka.
      window.print();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Terjadi kesalahan yang tidak terduga.",
      );
    } finally {
      setPending(null);
    }
  }

  function onReset() {
    setPreview(null);
    setScannedToken(null);
    setCode("");
    setError(null);
    setInfo(null);
    focusInput();
  }

  const tone = preview ? redemptionTone(preview.redemption) : null;

  return (
    <section className="space-y-6">
      <div className="print:hidden">
        <form onSubmit={onLookup} className="space-y-4" noValidate>
          <Field
            id="redemption_token"
            label="Kode penukaran"
            hint="Pindai barcode penukaran dengan scanner, atau ketik kodenya lalu tekan Enter."
            error={preview ? undefined : (error ?? undefined)}
          >
            <input
              ref={inputRef}
              id="redemption_token"
              name="redemption_token"
              type="text"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              autoFocus
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className={inputClass}
            />
          </Field>

          <button
            type="submit"
            disabled={pending !== null}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-ocean px-5 py-2.5 font-semibold text-ivory transition-colors hover:bg-ocean-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending === "lookup" ? "Memeriksa…" : "Periksa Kode"}
          </button>
        </form>

        <p className="mt-4 rounded-md border border-line bg-surface-soft px-3 py-2 text-xs text-muted">
          Kode penukaran hanya untuk mengambil booking online di loket. Barcode
          gelang mengidentifikasi tiket individual, bukan token check-in
          gerbang; penukaran tidak mencatat check-in.
        </p>
      </div>

      {preview && tone ? (
        <>
          <div className="print:hidden space-y-6">
            <section className="rounded-lg border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Ringkasan pesanan</h2>
                <StatusBadge
                  status={preview.payment?.status ?? "pending"}
                  label={preview.payment?.status_label ?? "Belum ada pembayaran"}
                />
              </div>

              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Kode booking</dt>
                  <dd className="font-mono text-foreground">
                    {preview.transaction_code}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Pemilik</dt>
                  <dd className="text-foreground">{preview.owner?.name ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Tanggal kunjungan</dt>
                  <dd className="text-foreground">{preview.visit_date ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Jumlah pengunjung</dt>
                  <dd className="text-foreground">{preview.visitor_count}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Jumlah kendaraan</dt>
                  <dd className="text-foreground">
                    {preview.vehicles.reduce((sum, v) => sum + v.quantity, 0)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Jumlah tiket</dt>
                  <dd className="text-foreground">{preview.tickets.length}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-line pt-2 text-base font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular-nums">
                    {formatRupiah(preview.total_amount)}
                  </dd>
                </div>
              </dl>

              <ul className="mt-3 space-y-2 text-sm">
                {preview.visitors.map((visitor) => (
                  <li
                    key={visitor.id}
                    className="flex justify-between gap-4 rounded-md border border-line px-3 py-2"
                  >
                    <span>{visitor.full_name}</span>
                    <span className="font-mono text-xs text-muted">
                      {visitor.masked_nik}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-line bg-surface p-4">
              <h2 className="text-lg font-semibold">Status penukaran</h2>

              <p
                className={`mt-3 inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${TONE_STYLES[tone]}`}
              >
                {preview.redemption.status_label}
              </p>

              {preview.redemption.block_reason ? (
                <p className="mt-3 text-sm text-red-700">
                  {preview.redemption.block_reason}
                </p>
              ) : null}

              {preview.redemption.redeemed ? (
                <p className="mt-3 text-sm text-muted">
                  Ditukarkan {formatRedeemedAt(preview.redemption.redeemed_at)}
                  {preview.redemption.redeemed_by
                    ? ` oleh ${preview.redemption.redeemed_by.name}`
                    : ""}
                  .
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-3">
                {preview.redemption.can_redeem ? (
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={pending !== null}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-ocean px-5 py-2 font-semibold text-ivory transition-colors hover:bg-ocean-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pending === "confirm"
                      ? "Mencatat…"
                      : "Konfirmasi Penukaran"}
                  </button>
                ) : null}

                {preview.redemption.redeemed ? (
                  <button
                    type="button"
                    onClick={onPrint}
                    disabled={pending !== null}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-surface px-5 py-2 font-semibold text-foreground transition-colors hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pending === "print"
                      ? "Mencatat…"
                      : wristbandButtonLabel(hasPrintedTickets(preview.tickets))}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={onReset}
                  disabled={pending !== null}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-surface px-5 py-2 font-semibold text-foreground transition-colors hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Penukaran baru
                </button>
              </div>

              {/* Feedback konfirmasi/cetak ditampilkan di dekat tombol pemicu
                  agar terlihat di layar kecil tanpa perlu menggulir. */}
              {error ? (
                <p
                  role="alert"
                  className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {error}
                </p>
              ) : null}

              {info ? (
                <p
                  role="status"
                  className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
                >
                  {info}
                </p>
              ) : null}

              {preview.redemption.redeemed ? (
                <p className="mt-3 text-xs text-muted">
                  Cetak ulang tidak membuat tiket baru, tidak menggandakan
                  penukaran, dan tidak membuat check-in gerbang. Berhasilnya
                  pencatatan tidak membuktikan gelang tercetak secara fisik.
                </p>
              ) : null}
            </section>
          </div>

          {/* Gelang hanya dirender setelah penukaran tercatat di backend.
              Mencegah Ctrl+P browser mencetak gelang untuk booking yang belum
              ditukar tanpa jejak audit /redemptions/print. */}
          {preview.redemption.redeemed ? (
            <div className="space-y-4 print:mt-0 print:space-y-3">
              {preview.tickets.map((ticket) => (
                <WristbandCard
                  key={ticket.id}
                  transaction={preview}
                  ticket={ticket}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
