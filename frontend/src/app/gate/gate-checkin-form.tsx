"use client";

import { useRef, useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { gateTone, type GateTone } from "@/lib/gate/status";
import type { GateCheckinResponse, GateCheckinResult } from "@/lib/gate/types";

type Outcome = {
  tone: GateTone;
  message: string;
  result?: GateCheckinResult;
};

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 font-mono outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600";

const TONE_STYLES: Record<GateTone, string> = {
  success: "border-emerald-300 bg-emerald-50 text-emerald-900",
  used: "border-amber-300 bg-amber-50 text-amber-900",
  rejected: "border-red-300 bg-red-50 text-red-700",
};

const TONE_HEADINGS: Record<GateTone, string> = {
  success: "Check-in berhasil",
  used: "Tiket sudah pernah check-in",
  rejected: "Validasi ditolak",
};

function formatCheckedInAt(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("id-ID");
}

/**
 * Form validasi gerbang. Pemindai barcode USB bekerja seperti keyboard: mengetik
 * token lalu menekan Enter, sehingga submit otomatis. Token dibersihkan setiap
 * kali percobaan selesai dan tidak pernah disimpan di browser maupun URL.
 */
export default function GateCheckinForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = token.trim();

    if (value === "" || pending) {
      return;
    }

    setPending(true);
    setOutcome(null);

    try {
      const payload = await apiRequest<GateCheckinResponse>(
        "/api/gate/check-in",
        { barcode_token: value },
      );

      setOutcome({
        tone: "success",
        message: payload.message,
        result: payload.data,
      });
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0;
      const message =
        error instanceof ApiError
          ? error.message
          : "Terjadi kesalahan yang tidak terduga.";

      setOutcome({ tone: gateTone(status), message });
    } finally {
      setToken("");
      setPending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="rounded-lg border border-neutral-200 bg-white p-4">
        <label
          htmlFor="barcode_token"
          className="block text-sm font-medium text-neutral-800"
        >
          Barcode tiket
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
            className={inputClass}
            placeholder="Pindai atau ketik token"
            aria-describedby="barcode_help"
          />
          <button
            type="submit"
            disabled={pending || token.trim() === ""}
            className="shrink-0 rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Memvalidasi…" : "Validasi"}
          </button>
        </div>
        <p id="barcode_help" className="mt-2 text-xs text-neutral-500">
          Kolom akan siap menerima pindai berikutnya setelah setiap percobaan.
        </p>
      </form>

      <div aria-live="polite" className="mt-4">
        {outcome ? (
          <section
            role="status"
            className={`rounded-lg border p-4 ${TONE_STYLES[outcome.tone]}`}
          >
            <h2 className="text-lg font-semibold">
              {TONE_HEADINGS[outcome.tone]}
            </h2>
            <p className="mt-1 text-sm">{outcome.message}</p>

            {outcome.result ? (
              <dl className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="opacity-70">Kode transaksi</dt>
                  <dd className="font-mono">{outcome.result.transaction_code}</dd>
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
