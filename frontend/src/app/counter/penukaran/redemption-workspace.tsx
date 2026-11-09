"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { BarcodeDetector } from "barcode-detector/ponyfill";
import Field from "@/components/field";
import Alert from "@/components/ui/alert";
import StatusBadge from "@/components/counter/status-badge";
import { inputClass } from "@/components/ui/input";
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  redemptionTone,
  type RedemptionTone,
} from "@/lib/counter/redemption";
import type { RedemptionTransaction } from "@/lib/counter/types";
import { formatRupiah } from "@/lib/pricing/tariffs";

type Pending = "lookup" | "verify" | null;

/* Warna mengikuti token status semantik, bukan nama warna Tailwind lepas. */
const TONE_STYLES: Record<RedemptionTone, string> = {
  redeemable: "border-warning/30 bg-warning-soft text-warning",
  redeemed: "border-success/30 bg-success-soft text-success",
  blocked: "border-danger/30 bg-danger-soft text-danger",
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
 * Meja verifikasi booking online (Loket 2).
 *
 * Alurnya: pindai/ketik kode penukaran → pratinjau pesanan → verifikasi
 * read-only. Loket 2 tidak mengonsumsi token, tidak menandai booking sebagai
 * sudah ditukarkan, dan tidak mencetak tiket fisik; pencetakan dilakukan di
 * gate. Kode penukaran tidak pernah masuk ke URL.
 *
 * Prinsipnya: memindai, membuka pratinjau, atau menekan verifikasi TIDAK
 * menandai booking sebagai sudah ditukarkan. Backend tetap sumber kebenaran
 * dan token hanya dikonsumsi oleh alur gate print.
 */
export default function RedemptionWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const scanningRef = useRef(false);
  const lookupPendingRef = useRef(false);
  const lastTokenRef = useRef<string>("");
  const stopRequestedRef = useRef(false);

  const [code, setCode] = useState("");
  const [scannedToken, setScannedToken] = useState<string | null>(null);
  const [preview, setPreview] = useState<RedemptionTransaction | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [mode, setMode] = useState<"scanner" | "camera">("scanner");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    lookupPendingRef.current = pending === "lookup";
  }, [pending]);

  function stopCamera() {
    stopRequestedRef.current = true;
    scanningRef.current = false;

    if (scanTimerRef.current !== null) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }

    detectorRef.current = null;
    setCameraActive(false);
    setCameraStatus(null);
  }

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  function focusInput() {
    inputRef.current?.focus();
    inputRef.current?.select();
  }

  async function doLookup(token: string) {
    const entered = token.trim();
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
      if (cameraActive) {
        scanningRef.current = true;
      }
    }
  }

  async function onLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await doLookup(code);
  }

  async function onVerify() {
    if (!scannedToken) return;

    setPending("verify");
    setError(null);
    setInfo(null);

    try {
      const response = await apiRequest<{
        message: string;
        data: RedemptionTransaction;
      }>("/api/counter/redemptions/verify", {
        redemption_token: scannedToken,
      });

      setPreview(response.data);
      setInfo(
        response.message ||
          "Booking terverifikasi. Silakan menuju gate untuk pencetakan tiket fisik.",
      );
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Terjadi kesalahan yang tidak terduga.",
      );
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
      // Jika lookup ulang gagal, biarkan pesan error verifikasi yang tampil.
    }
  }

  async function startCamera() {
    if (cameraActive || lookupPendingRef.current || pending !== null) {
      return;
    }

    stopRequestedRef.current = false;
    setCameraError(null);
    setError(null);
    setInfo(null);
    setCameraStatus("Meminta izin kamera...");

    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setCameraError("Kamera tidak tersedia di perangkat ini.");
        setCameraStatus(null);
        return;
      }

      const detector = new BarcodeDetector({
        formats: ["qr_code", "code_128"],
      });
      detectorRef.current = detector;

      let stream: MediaStream | null = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (err) {
          if (err instanceof DOMException && err.name === "NotAllowedError") {
            setCameraError(
              "Izin akses kamera ditolak. Gunakan mode scanner fisik.",
            );
          } else if (err instanceof DOMException && err.name === "NotFoundError") {
            setCameraError("Tidak ditemukan kamera yang dapat digunakan.");
          } else {
            setCameraError("Tidak dapat mengakses kamera.");
          }
          setCameraStatus(null);
          detectorRef.current = null;
          return;
        }
      }

      if (stopRequestedRef.current) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;

      if (video) {
        video.srcObject = stream;
        try {
          await video.play();
        } catch {
          // ignore
        }
      }

      setCameraActive(true);
      setCameraStatus(
        "Arahkan kamera ke QR kode penukaran (atau kode pada tiket).",
      );
      lastTokenRef.current = "";
      scanningRef.current = true;

      if (scanTimerRef.current !== null) {
        window.clearInterval(scanTimerRef.current);
      }

      scanTimerRef.current = window.setInterval(async () => {
        if (stopRequestedRef.current || !scanningRef.current) {
          return;
        }
        if (lookupPendingRef.current || pending !== null) {
          return;
        }

        const detector = detectorRef.current;
        const videoEl = videoRef.current;
        if (!detector || !videoEl) return;
        if (videoEl.readyState < 2) return;

        try {
          const barcodes = await detector.detect(videoEl);
          if (!barcodes || barcodes.length === 0) return;
          const raw = barcodes[0]?.rawValue ?? "";
          const normalizedRaw = raw.replace(/\r?\n/g, "").trim().replace(/\s+/g, "");
          if (!normalizedRaw) return;
          if (normalizedRaw === lastTokenRef.current) return;
          lastTokenRef.current = normalizedRaw;
          scanningRef.current = false;
          await doLookup(normalizedRaw);
        } catch {
          // ignore
        }
      }, 250);
    } catch {
      setCameraError("Tidak dapat memulai pemindaian kamera.");
      setCameraStatus(null);
      detectorRef.current = null;
    }
  }

  function switchToScanner() {
    stopCamera();
    setCameraError(null);
    setMode("scanner");
    setTimeout(() => focusInput(), 0);
  }

  function switchToCamera() {
    setMode("camera");
    setCameraError(null);
    setError(null);
    setInfo(null);
  }

  function onReset() {
    setPreview(null);
    setScannedToken(null);
    setCode("");
    setError(null);
    setInfo(null);
    lastTokenRef.current = "";
    if (cameraActive) {
      scanningRef.current = true;
    }
    focusInput();
  }

  const tone = preview ? redemptionTone(preview.redemption) : null;

  return (
    <section className="space-y-6">
      <div className="print:hidden">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={switchToScanner}
            className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 py-1 text-sm font-semibold transition-colors ${
              mode === "scanner"
                ? "bg-ocean text-ivory"
                : "border border-line bg-surface text-foreground hover:bg-surface-soft"
            }`}
          >
            Mode scanner fisik
          </button>

          <button
            type="button"
            onClick={switchToCamera}
            className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 py-1 text-sm font-semibold transition-colors ${
              mode === "camera"
                ? "bg-ocean text-ivory"
                : "border border-line bg-surface text-foreground hover:bg-surface-soft"
            }`}
          >
            Mode kamera
          </button>
        </div>

        {mode === "scanner" ? (
          <form onSubmit={onLookup} className="space-y-4" noValidate>
            <Field
              id="redemption_token"
              label="Kode penukaran"
              hint="Pindai barcode penukaran dengan scanner fisik, atau ketik kodenya lalu tekan Enter."
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
                className={inputClass("font-mono")}
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
        ) : (
          <section className="card-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-medium text-foreground">
                  Pemindaian dengan kamera
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Arahkan kamera ke QR kode penukaran pada halaman booking pengunjung.
                  Kamera belakang diprioritaskan bila tersedia.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!cameraActive ? (
                  <button
                    type="button"
                    onClick={startCamera}
                    disabled={pending !== null}
                    className="inline-flex min-h-10 items-center justify-center rounded-full bg-ocean px-4 py-1 text-sm font-semibold text-ivory transition-colors hover:bg-ocean-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Aktifkan kamera
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-line bg-surface px-4 py-1 text-sm font-semibold text-foreground transition-colors hover:bg-surface-soft"
                  >
                    Hentikan kamera
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 overflow-hidden rounded-md border border-line bg-black">
              <video
                ref={videoRef}
                className="aspect-video w-full object-cover"
                playsInline
                muted
                autoPlay
              />
            </div>

            {cameraStatus ? (
              <p role="status" className="mt-2 text-xs text-muted">
                {cameraStatus}
              </p>
            ) : null}

            {cameraError ? (
              <p role="alert" className="mt-2 text-xs font-medium text-danger">
                {cameraError}
              </p>
            ) : null}
          </section>
        )}

        <p className="mt-4 rounded-md border border-line bg-surface-soft px-3 py-2 text-xs text-muted">
          Loket 2 memverifikasi booking online tanpa mengonsumsi token dan tanpa
          mencetak tiket. Pencetakan tiket fisik dilakukan petugas gate; barcode
          gelang tetap menjadi identitas tiket individual, bukan token check-in.
        </p>
      </div>

      {preview && tone ? (
        <>
          <div className="print:hidden space-y-6">
            <section className="card-surface p-4">
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

            <section className="card-surface p-4">
              <h2 className="text-lg font-semibold">Status verifikasi</h2>

              <p
                className={`mt-3 inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${TONE_STYLES[tone]}`}
              >
                {preview.redemption.status_label}
              </p>

              {preview.redemption.block_reason ? (
                <p className="mt-3 text-sm text-warning">
                  {preview.redemption.block_reason}
                </p>
              ) : null}

              {preview.redemption.redeemed ? (
                <p className="mt-3 text-sm text-muted">
                  Sudah ditukarkan{" "}
                  {formatRedeemedAt(preview.redemption.redeemed_at)}
                  {preview.redemption.redeemed_by
                    ? ` oleh ${preview.redemption.redeemed_by.name}`
                    : ""}
                  . Token sudah tidak dapat dicetak ulang di gate.
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-3">
                {!preview.redemption.redeemed ? (
                  <button
                    type="button"
                    onClick={() => {
                      void onVerify();
                    }}
                    disabled={pending !== null}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-ocean px-5 py-2 font-semibold text-ivory transition-colors hover:bg-ocean-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pending === "verify"
                      ? "Memverifikasi…"
                      : "Verifikasi Booking"}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={onReset}
                  disabled={pending !== null}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-surface px-5 py-2 font-semibold text-foreground transition-colors hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Verifikasi baru
                </button>
              </div>

              {/* Feedback verifikasi ditampilkan di dekat tombol pemicu agar
                  terlihat di layar kecil tanpa perlu menggulir. */}
              {error ? (
                <Alert tone="danger" className="mt-3">
                  {error}
                </Alert>
              ) : null}

              {info ? (
                <Alert tone="success" className="mt-3">
                  {info}
                </Alert>
              ) : null}
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}
