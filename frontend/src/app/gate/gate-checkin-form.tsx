"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { inputClass } from "@/components/ui/input";
import { apiRequest } from "@/lib/api/client";
import { ApiError, kindForStatus } from "@/lib/api/errors";
import { gateTone, type GateTone } from "@/lib/gate/status";
import { useCameraScanner } from "@/lib/gate/use-camera-scanner";
import type { GateCheckinResponse, GateCheckinResult } from "@/lib/gate/types";

type Outcome = {
  tone: GateTone;
  message: string;
  result?: GateCheckinResult;
  /**
   * true bila kegagalan karena gangguan sistem (jaringan, sesi habis, server),
   * bukan vonis atas tiket. Panel hasil memakai gaya netral dan tidak menampilkan
   * "Validasi ditolak" agar petugas tidak salah menilai tiket yang valid.
   */
  systemError?: boolean;
  /** true bila sesi berakhir (401) sehingga perlu tautan masuk ulang. */
  needsLogin?: boolean;
};

/* Warna mengikuti token status semantik, bukan nama warna Tailwind lepas. */
const TONE_STYLES: Record<GateTone, string> = {
  success: "border-success/30 bg-success-soft text-success",
  used: "border-warning/30 bg-warning-soft text-warning",
  rejected: "border-danger/30 bg-danger-soft text-danger",
};

const TONE_HEADINGS: Record<GateTone, string> = {
  success: "Check-in berhasil",
  used: "Tiket sudah pernah check-in",
  rejected: "Validasi ditolak",
};

const SYSTEM_STYLE = "border-line bg-surface-soft text-foreground";

function formatCheckedInAt(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("id-ID");
}

/**
 * Form validasi gerbang. Pemindai barcode USB bekerja seperti keyboard: mengetik
 * token lalu menekan Enter, sehingga submit otomatis. Token dibersihkan di awal
 * setiap percobaan (bukan di akhir) supaya pindai kedua yang datang saat proses
 * masih berjalan tidak terhapus diam-diam. Token tidak pernah disimpan di
 * browser maupun URL.
 */
export default function GateCheckinForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef(false);

  const {
    videoRef,
    cameraActive,
    cameraStatus,
    cameraError,
    startCamera,
    stopCamera,
    clearCameraError,
  } = useCameraScanner({
    onDetected: (value) => {
      void submitToken(value, { fromCamera: true });
    },
    isPaused: () => pendingRef.current,
    statusHint: "Arahkan kamera ke barcode Code 128 pada layar HP.",
  });

  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [mode, setMode] = useState<"scanner" | "camera">("scanner");

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  async function submitToken(
    value: string,
    opts?: { fromCamera?: boolean },
  ) {
    const normalized = value.replace(/\r?\n/g, "").trim();
    const trimmed = normalized.replace(/\s+/g, "");

    if (trimmed === "") {
      setNotice("Barcode belum dipindai atau diisi.");

      if (!opts?.fromCamera) {
        inputRef.current?.focus();
      }

      return;
    }

    if (trimmed.startsWith("RDM-")) {
      setNotice(null);
      setOutcome({
        tone: "rejected",
        message:
          "Kode penukaran online (RDM-) tidak dapat digunakan untuk check-in gerbang. Gunakan bagian Pencetakan tiket fisik di halaman ini.",
      });
      if (!opts?.fromCamera) {
        inputRef.current?.focus();
      }
      return;
    }

    if (pendingRef.current) {
      setNotice("Masih memproses pindai sebelumnya. Silakan pindai ulang.");
      return;
    }

    setNotice(null);
    setPending(true);
    setOutcome(null);

    if (!opts?.fromCamera) {
      setToken("");
    }

    try {
      const payload = await apiRequest<GateCheckinResponse>(
        "/api/gate/check-in",
        { barcode_token: trimmed },
      );

      setOutcome({
        tone: "success",
        message: payload.message,
        result: payload.data,
      });
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0;
      const kind =
        error instanceof ApiError ? error.kind : kindForStatus(status);
      const message =
        error instanceof ApiError
          ? error.message
          : "Terjadi kesalahan yang tidak terduga.";

      const systemError =
        kind === "network" ||
        kind === "unauthorized" ||
        kind === "forbidden" ||
        kind === "server";

      setOutcome({
        tone: gateTone(status),
        message,
        systemError,
        needsLogin: kind === "unauthorized",
      });
    } finally {
      setPending(false);

      if (!opts?.fromCamera) {
        inputRef.current?.focus();
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitToken(token);
  }

  function switchToScanner() {
    stopCamera();
    setMode("scanner");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function switchToCamera() {
    setMode("camera");
    clearCameraError();
    setNotice(null);
  }

  return (
    <div>
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
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-line bg-surface p-4"
        >
          <label
            htmlFor="barcode_token"
            className="block text-sm font-medium text-foreground"
          >
            Barcode gerbang
          </label>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="barcode_token"
              name="barcode_token"
              ref={inputRef}
              value={token}
              onChange={(event) => setToken(event.target.value)}
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className={inputClass("font-mono")}
              placeholder="Pindai atau ketik token"
              aria-describedby="barcode_help"
            />

            <button
              type="submit"
              disabled={pending || token.trim() === ""}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-ocean px-5 py-2 font-semibold text-ivory transition-colors hover:bg-ocean-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Memvalidasi…" : "Validasi"}
            </button>
          </div>

          <p id="barcode_help" className="mt-2 text-xs text-muted">
            Kolom akan siap menerima pindai berikutnya setelah setiap percobaan.
          </p>

          {notice ? (
            <p role="status" className="mt-2 text-xs font-medium text-warning">
              {notice}
            </p>
          ) : null}
        </form>
      ) : (
        <section className="rounded-lg border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium text-foreground">
                Pemindaian dengan kamera
              </h2>
              <p className="mt-1 text-xs text-muted">
                Membaca barcode Code 128 dari layar HP. Kamera belakang
                diprioritaskan bila tersedia.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={pending}
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

          {notice ? (
            <p role="status" className="mt-2 text-xs font-medium text-warning">
              {notice}
            </p>
          ) : null}
        </section>
      )}

      <div
        aria-live={outcome?.tone === "rejected" ? "assertive" : "polite"}
        className="mt-4"
      >
        {outcome ? (
          <section
            className={`rounded-lg border p-4 ${
              outcome.systemError
                ? SYSTEM_STYLE
                : TONE_STYLES[outcome.tone]
            }`}
          >
            <h2 className="text-lg font-semibold">
              {outcome.needsLogin
                ? "Sesi berakhir"
                : outcome.systemError
                  ? "Tidak dapat memvalidasi"
                  : TONE_HEADINGS[outcome.tone]}
            </h2>

            <p className="mt-1 text-sm">{outcome.message}</p>

            {outcome.needsLogin ? (
              <Link
                href="/login"
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-ocean px-5 py-2 text-sm font-semibold text-ivory transition-colors hover:bg-ocean-dark"
              >
                Masuk kembali
              </Link>
            ) : null}

            {outcome.result ? (
              <dl className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="opacity-70">Kode transaksi</dt>
                  <dd className="font-mono">
                    {outcome.result.transaction_code}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="opacity-70">Sumber</dt>
                  <dd>{outcome.result.source_label}</dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="opacity-70">Jumlah hadir</dt>
                  <dd className="text-base font-semibold">
                    {outcome.result.visitor_count} orang
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="opacity-70">Tanggal kunjungan</dt>
                  <dd>{outcome.result.visit_date ?? "—"}</dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="opacity-70">Waktu check-in</dt>
                  <dd>{formatCheckedInAt(outcome.result.checked_in_at)}</dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="opacity-70">Petugas</dt>
                  <dd>{outcome.result.validated_by?.name ?? "—"}</dd>
                </div>
              </dl>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}