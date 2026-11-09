"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Alert from "@/components/ui/alert";
import { inputClass } from "@/components/ui/input";
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { useCameraScanner } from "@/lib/gate/use-camera-scanner";
import type { RedemptionTransaction } from "@/lib/counter/types";
import WristbandCard from "@/components/counter/wristband-card";
import { formatRupiah } from "@/lib/pricing/tariffs";

type Pending = "lookup" | "print" | null;

function normalize(value: string): string {
  return value
    .replace(/\r?\n/g, "")
    .trim()
    .replace(/\s+/g, "");
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "Terjadi kesalahan yang tidak terduga.";
}

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
 * Pencetakan tiket fisik booking online di gerbang.
 *
 * Pindai QR `RDM-` (kamera atau scanner fisik) → lookup read-only → petugas
 * memeriksa ringkasan → tekan tombol cetak. Pencetakan TIDAK pernah otomatis
 * saat lookup, dan tidak pernah mengirim kode ke endpoint check-in. Hanya
 * aksi cetak yang mengonsumsi token, sehingga satu booking tidak dapat dicetak
 * dua kali lewat alur ini.
 */
export default function GatePrintForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef(false);
  const detectRef = useRef<(value: string) => void>(() => {});
  const printAfterRenderRef = useRef(false);

  const {
    videoRef,
    cameraActive,
    cameraStatus,
    cameraError,
    startCamera,
    stopCamera,
    clearCameraError,
  } = useCameraScanner({
    onDetected: (value) => detectRef.current(value),
    isPaused: () => pendingRef.current,
    statusHint:
      "Arahkan kamera ke QR kode penukaran (RDM-) pada layar HP pengunjung.",
  });

  const [code, setCode] = useState("");
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [data, setData] = useState<RedemptionTransaction | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<"scanner" | "camera">("scanner");

  const doLookup = useCallback(
    async (value: string, opts?: { fromCamera?: boolean }) => {
      const token = normalize(value);

      if (token === "") {
        setError("Kode penukaran wajib dipindai atau diisi.");
        if (!opts?.fromCamera) {
          inputRef.current?.focus();
        }
        return;
      }

      // Kamera pada bagian ini hanya untuk QR booking online. Barcode gerbang
      // tetap menjadi milik bagian check-in dan tidak boleh dikirim ke sini.
      if (!token.toUpperCase().startsWith("RDM-")) {
        setData(null);
        setScannedCode(null);
        setNotice(null);
        setError(
          "Kode ini bukan kode penukaran online (RDM-). Gunakan barcode gerbang pada bagian Validasi masuk.",
        );
        if (!opts?.fromCamera) {
          inputRef.current?.focus();
        }
        return;
      }

      pendingRef.current = true;
      setPending("lookup");
      setError(null);
      setNotice(null);
      setData(null);
      setScannedCode(null);

      try {
        const payload = await apiRequest<{ data: RedemptionTransaction }>(
          "/api/gate/print/lookup",
          { code: token },
        );

        setData(payload.data);
        setScannedCode(token);
        setCode("");
        setNotice(
          "Booking ditemukan. Periksa ringkasan, lalu tekan tombol cetak untuk mencetak tiket fisik.",
        );
        // Lookup selesai: matikan kamera agar tidak ada pindai berulang.
        stopCamera();
      } catch (caught) {
        setData(null);
        setScannedCode(null);
        setError(errorMessage(caught));
      } finally {
        pendingRef.current = false;
        setPending(null);
        if (!opts?.fromCamera) {
          inputRef.current?.focus();
        }
      }
    },
    [stopCamera],
  );

  useEffect(() => {
    detectRef.current = (value) => {
      void doLookup(value, { fromCamera: true });
    };
  }, [doLookup]);

  /*
   * Dialog cetak dibuka setelah React selesai merender gelang dan font siap,
   * bukan lewat jeda waktu tetap. Dengan begitu SVG barcode sudah berada di DOM
   * saat Chrome mengambil snapshot media cetak. Effect ini tidak pernah
   * mengirim request: token tetap hanya dikonsumsi oleh `printTickets()`.
   */
  useEffect(() => {
    if (!printAfterRenderRef.current || !data) {
      return;
    }

    printAfterRenderRef.current = false;
    let cancelled = false;
    let frame = 0;

    const openPrintDialog = () => {
      if (cancelled) {
        return;
      }

      const fontsReady = document.fonts?.ready ?? Promise.resolve();

      void fontsReady.then(() => {
        if (!cancelled) {
          window.print();
        }
      });
    };

    frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(openPrintDialog);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [data]);

  async function printTickets() {
    if (!scannedCode) {
      return;
    }

    pendingRef.current = true;
    setPending("print");
    setError(null);
    setNotice(null);

    try {
      const payload = await apiRequest<{
        message: string;
        data: RedemptionTransaction;
      }>("/api/gate/print", { code: scannedCode });

      printAfterRenderRef.current = true;
      setData(payload.data);
      setNotice(payload.message);
      stopCamera();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      pendingRef.current = false;
      setPending(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void doLookup(code);
  }

  function switchToScanner() {
    stopCamera();
    setError(null);
    setMode("scanner");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function switchToCamera() {
    setMode("camera");
    clearCameraError();
    setNotice(null);
  }

  const canPrint = data !== null && !data.redemption.redeemed;
  const alreadyPrinted = data?.redemption.redeemed ?? false;

  return (
    <div className="mt-6 print:mt-0">
      <div className="mb-3 flex flex-wrap items-center gap-2 print:hidden">
        <button
          type="button"
          onClick={switchToScanner}
          className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 py-1 text-sm font-semibold transition-colors ${
            mode === "scanner"
              ? "bg-ocean text-ivory"
              : "border border-line bg-surface text-foreground hover:bg-surface-soft"
          }`}
        >
          Scanner fisik
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
          Kamera
        </button>
      </div>

      {mode === "scanner" ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-line bg-surface p-4 print:hidden"
        >
          <label
            htmlFor="gate_print_code"
            className="block text-sm font-medium text-foreground"
          >
            Kode penukaran online (RDM-)
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="gate_print_code"
              ref={inputRef}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className={inputClass("font-mono")}
              placeholder="Pindai atau ketik kode RDM-"
            />
            <button
              type="submit"
              disabled={pending !== null || code.trim() === ""}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-ocean px-5 py-2 font-semibold text-ivory transition-colors hover:bg-ocean-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending === "lookup" ? "Mencari…" : "Cari booking"}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Hanya untuk booking online yang sudah lunas. Alur ini terpisah dari
            check-in gerbang dan tidak mengubah status kunjungan.
          </p>
        </form>
      ) : (
        <section className="rounded-lg border border-line bg-surface p-4 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium text-foreground">
                Pemindaian dengan kamera
              </h2>
              <p className="mt-1 text-xs text-muted">
                Membaca QR kode penukaran online (RDM-). Setelah booking
                ditemukan, kamera dimatikan otomatis.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={() => {
                    void startCamera();
                  }}
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

      {error ? (
        <Alert tone="danger" className="mt-3 print:hidden">
          {error}
        </Alert>
      ) : null}

      {notice && !error ? (
        <Alert tone="success" className="mt-3 print:hidden">
          {notice}
        </Alert>
      ) : null}

      {data ? (
        <section className="gate-print-host mt-4 rounded-lg border border-line bg-surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">
                Ringkasan booking
              </p>
              <h2 className="text-lg font-semibold">
                {data.owner?.name ?? "—"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {data.transaction_code} · Kunjungan {data.visit_date ?? "—"} ·{" "}
                {data.visitor_count} pengunjung
              </p>
              <p className="mt-1 text-sm text-muted">
                Pembayaran: {data.payment?.status_label ?? "—"} · Total{" "}
                {formatRupiah(data.total_amount)}
              </p>
              <p className="mt-1 text-sm text-muted">
                Status penukaran: {data.redemption.status_label}
                {data.redemption.redeemed_at
                  ? ` (${formatRedeemedAt(data.redemption.redeemed_at)})`
                  : ""}
              </p>
            </div>

            {canPrint ? (
              <button
                type="button"
                onClick={() => {
                  void printTickets();
                }}
                disabled={pending !== null}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-ocean px-5 py-2 font-semibold text-ivory transition-colors hover:bg-ocean-dark disabled:cursor-not-allowed disabled:opacity-60 print:hidden"
              >
                {pending === "print" ? "Mencetak…" : "Cetak tiket fisik"}
              </button>
            ) : null}

            {alreadyPrinted ? (
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-line bg-surface px-4 py-1 text-sm font-semibold text-foreground transition-colors hover:bg-surface-soft print:hidden"
              >
                Cetak ulang di browser
              </button>
            ) : null}
          </div>

          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 print:hidden">
            {data.visitors.map((visitor) => (
              <p
                key={visitor.id}
                className="flex justify-between gap-4 rounded-md border border-line px-3 py-2"
              >
                <span>{visitor.full_name}</span>
                <span className="font-mono text-xs text-muted">
                  {visitor.masked_nik}
                </span>
              </p>
            ))}
          </div>

          {alreadyPrinted && data.tickets.length > 0 ? (
            <div className="gate-print-area mt-4 space-y-4 print:mt-0 print:space-y-0">
              {data.tickets.map((ticket) => (
                <div key={ticket.id} className="print-ticket">
                  <WristbandCard transaction={data} ticket={ticket} />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted print:hidden">
              Tiket fisik belum dicetak. Tekan tombol cetak untuk mengonsumsi
              token dan membuka dialog cetak.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
