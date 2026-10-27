"use client";

import {
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import Field from "@/components/field";
import StatusBadge from "@/components/counter/status-badge";
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  facilityClaimLabel,
  facilityTone,
  type FacilityTone,
} from "@/lib/counter/facility";
import type { FacilityEntitlement, FacilityTicket } from "@/lib/counter/types";

type Pending = "lookup" | "claim" | null;

/** Tidak ada sumber eksternal; dipakai hanya untuk mendeteksi hidrasi. */
const subscribeToNothing = () => () => {};

const inputClass =
  "w-full min-w-0 rounded-md border border-line bg-surface px-3 py-2 font-mono text-foreground outline-none transition focus:border-ocean focus:ring-1 focus:ring-ocean";

const TONE_STYLES: Record<FacilityTone, string> = {
  claimable: "border-amber-300 bg-amber-50 text-amber-900",
  redeemed: "border-emerald-300 bg-emerald-50 text-emerald-900",
  blocked: "border-red-300 bg-red-50 text-red-700",
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Meja klaim fasilitas per tiket individual di loket.
 *
 * Alurnya: pindai/ketik kode tiket pada gelang → pratinjau (hanya baca) →
 * klaim satu fasilitas. Kode tiket tidak pernah masuk ke URL dan bukan kode
 * penukaran online maupun barcode grup gerbang.
 *
 * Prinsipnya: pratinjau TIDAK mengklaim apa pun. Backend tetap sumber
 * kebenaran untuk pembayaran, check-in, tanggal kunjungan, status transaksi,
 * dan ketersediaan hak (422/409 dengan penguncian baris).
 */
export default function FacilityWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  // `false` saat server/awal hidrasi, `true` setelah React terpasang.
  const ready = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const [code, setCode] = useState("");
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [preview, setPreview] = useState<FacilityTicket | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function focusInput() {
    inputRef.current?.focus();
    inputRef.current?.select();
  }

  async function lookup() {
    if (pending !== null) return;

    const entered = code.trim();
    if (entered === "") {
      focusInput();
      return;
    }

    setPending("lookup");
    setError(null);
    setInfo(null);
    setClaimingId(null);

    try {
      const response = await apiRequest<{ data: FacilityTicket }>(
        "/api/counter/facilities/lookup",
        { ticket_code: entered },
      );

      setPreview(response.data);
      setScannedCode(entered);
      // Kosongkan agar pindai berikutnya tidak menempel pada kode lama.
      setCode("");
    } catch (caught) {
      setPreview(null);
      setScannedCode(null);
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

  async function onClaim(entitlement: FacilityEntitlement) {
    if (!scannedCode || !entitlement.code) return;

    setPending("claim");
    setClaimingId(entitlement.entitlement_id);
    setError(null);
    setInfo(null);

    try {
      const response = await apiRequest<{
        message: string;
        data: FacilityTicket;
      }>("/api/counter/facilities/claim", {
        ticket_code: scannedCode,
        facility_code: entitlement.code,
      });

      setPreview(response.data);
      setInfo(response.message);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Terjadi kesalahan yang tidak terduga.",
      );
      // Segarkan pratinjau agar status can_claim/blocked mencerminkan
      // kebenaran backend (mis. 409 sudah diklaim petugas lain), sehingga
      // tombol klaim tidak tetap aktif untuk aksi yang mustahil.
      await refreshPreview(scannedCode);
    } finally {
      setPending(null);
      setClaimingId(null);
    }
  }

  /** Ambil ulang pratinjau tanpa mengubah status pending utama. */
  async function refreshPreview(ticketCode: string) {
    try {
      const response = await apiRequest<{ data: FacilityTicket }>(
        "/api/counter/facilities/lookup",
        { ticket_code: ticketCode },
      );
      setPreview(response.data);
    } catch {
      // Jika lookup ulang gagal, biarkan pesan error klaim yang tampil.
    }
  }

  function onReset() {
    setPreview(null);
    setScannedCode(null);
    setCode("");
    setError(null);
    setInfo(null);
    setClaimingId(null);
    focusInput();
  }

  return (
    <section className="space-y-6">
      {/*
        Sengaja bukan <form>: sebelum React hydrate, submit native akan
        mengirim kode tiket sebagai query string ke URL. Handler eksplisit di
        bawah tidak punya fallback native, sehingga kode tidak pernah bocor ke
        riwayat browser/log akses.
      */}
      <div className="space-y-4" data-ready={ready ? "true" : "false"}>
        <Field
          id="ticket_code"
          label="Kode tiket wristband"
          hint="Pindai barcode tiket individual pada gelang, atau ketik kodenya lalu tekan Enter."
          error={preview ? undefined : (error ?? undefined)}
        >
          <input
            ref={inputRef}
            id="ticket_code"
            name="ticket_code"
            type="text"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            autoFocus
            value={code}
            onChange={(event) => setCode(event.target.value)}
            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void lookup();
              }
            }}
            className={inputClass}
          />
        </Field>

        <button
          type="button"
          onClick={() => void lookup()}
          disabled={!ready || pending !== null}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-ocean px-5 py-2.5 font-semibold text-ivory transition-colors hover:bg-ocean-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending === "lookup" ? "Memeriksa…" : "Periksa Tiket"}
        </button>
      </div>

      <p className="rounded-md border border-line bg-surface-soft px-3 py-2 text-xs text-muted">
        Klaim fasilitas hanya dapat dilakukan pada tanggal kunjungan dan setelah
        tiket tercatat check-in di gerbang. Kode tiket pada gelang berbeda dari
        kode penukaran online dan barcode grup gerbang.
      </p>

      {preview ? (
        <div className="space-y-6">
          <section className="rounded-lg border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Ringkasan tiket</h2>
              <StatusBadge
                status={preview.status}
                label={preview.status_label}
              />
            </div>

            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Kode tiket</dt>
                <dd className="font-mono text-foreground">
                  {preview.ticket_code}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Pengunjung</dt>
                <dd className="text-foreground">
                  {preview.visitor?.full_name ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">NIK</dt>
                <dd className="font-mono text-xs text-muted">
                  {preview.visitor?.masked_nik ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Kode transaksi</dt>
                <dd className="font-mono text-foreground">
                  {preview.transaction?.transaction_code ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Tanggal kunjungan</dt>
                <dd className="text-foreground">
                  {preview.transaction?.visit_date ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Pembayaran</dt>
                <dd className="text-foreground">
                  {preview.payment?.status_label ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Check-in gerbang</dt>
                <dd className="text-foreground">
                  {preview.checkin?.checked_in
                    ? `Sudah · ${formatDateTime(preview.checkin.checked_in_at)}`
                    : "Belum check-in"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-line bg-surface p-4">
            <h2 className="text-lg font-semibold">Hak fasilitas</h2>

            {preview.facilities.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                Tiket ini tidak memiliki hak fasilitas.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {preview.facilities.map((entitlement) => {
                  const tone = facilityTone(entitlement);

                  return (
                    <li
                      key={entitlement.entitlement_id}
                      className="rounded-md border border-line px-3 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">
                            {entitlement.name ?? entitlement.code ?? "Fasilitas"}
                          </p>
                          <p className="font-mono text-xs text-muted">
                            {entitlement.code ?? "—"}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${TONE_STYLES[tone]}`}
                        >
                          {entitlement.status_label}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-muted">
                        Diberikan {formatDateTime(entitlement.granted_at)}
                      </p>

                      {entitlement.redeemed_at ? (
                        <p className="mt-1 text-xs text-muted">
                          Diklaim {formatDateTime(entitlement.redeemed_at)}
                          {entitlement.redeemed_by
                            ? ` oleh ${entitlement.redeemed_by.name}`
                            : ""}
                          .
                        </p>
                      ) : null}

                      {/* Alasan blokir hanya relevan saat hak masih bisa
                          ditawarkan. Untuk hak yang sudah diklaim, riwayat
                          klaim di atas sudah menjadi penjelasannya. */}
                      {tone === "blocked" && entitlement.block_reason ? (
                        <p className="mt-2 text-sm text-red-700">
                          {entitlement.block_reason}
                        </p>
                      ) : null}

                      {entitlement.can_claim ? (
                        <button
                          type="button"
                          onClick={() => onClaim(entitlement)}
                          disabled={pending !== null}
                          className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-ocean px-5 py-2 font-semibold text-ivory transition-colors hover:bg-ocean-dark disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {pending === "claim" &&
                          claimingId === entitlement.entitlement_id
                            ? "Mencatat…"
                            : facilityClaimLabel(entitlement.name)}
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Feedback klaim ditampilkan di dekat tombol pemicu agar terlihat
                di layar kecil tanpa perlu menggulir. */}
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

            <p className="mt-3 text-xs text-muted">
              Klaim hanya dicatat sekali per tiket dan tidak membuat atau
              mengubah check-in gerbang.
            </p>
          </section>

          <button
            type="button"
            onClick={onReset}
            disabled={pending !== null}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-surface px-5 py-2 font-semibold text-foreground transition-colors hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            Tiket baru
          </button>
        </div>
      ) : null}
    </section>
  );
}
