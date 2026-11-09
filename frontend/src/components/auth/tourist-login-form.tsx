"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

interface TouristLoginFormProps {
  onSwitchToRegister: () => void;
  firstFocusableRef: React.RefObject<HTMLElement | null>;
  lastFocusableRef: React.RefObject<HTMLElement | null>;
}

export default function TouristLoginForm({
  onSwitchToRegister,
  firstFocusableRef,
  lastFocusableRef,
}: TouristLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFieldErrors({});
      setServerError(null);

      let valid = true;
      if (!email.trim()) {
        setFieldErrors((p) => ({ ...p, email: "Alamat email wajib diisi." }));
        valid = false;
      }
      if (!password) {
        setFieldErrors((p) => ({ ...p, password: "Kata sandi wajib diisi." }));
        valid = false;
      }
      if (!valid) return;

      setPending(true);
      try {
        // Placeholder untuk integrasi API. Ganti dengan panggilan sebenarnya.
        await new Promise((resolve) => setTimeout(resolve, 1200));
      } catch {
        setServerError("Gagal masuk. Periksa kembali email dan kata sandi.");
      } finally {
        setPending(false);
      }
    },
    [email, password]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <label
        htmlFor="auth-email"
        className="text-[13px] font-medium text-[var(--auth-text)]"
      >
        Alamat email
      </label>
      <div className="relative">
        <svg
          className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--auth-muted)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
        <input
          id="auth-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!fieldErrors.email ? true : undefined}
          aria-describedby={fieldErrors.email ? "auth-email-error" : undefined}
          className={`w-full min-h-[44px] rounded-full pl-10 pr-4 py-2.5 text-sm text-[var(--auth-text)] bg-[var(--auth-input-bg)] border border-transparent placeholder-[var(--auth-muted)] focus:border-[var(--auth-input-focus)] focus:ring-2 focus:ring-[var(--auth-input-focus)] focus:ring-offset-0 disabled:opacity-55 transition-all ${fieldErrors.email ? "border-[var(--auth-error)] focus:ring-[var(--auth-error)]" : ""}`}
          placeholder="nama@email.com"
          ref={firstFocusableRef as React.RefObject<HTMLInputElement>}
        />
      </div>
      {fieldErrors.email ? (
        <p id="auth-email-error" className="mt-1 text-xs text-[var(--auth-error)]">
          {fieldErrors.email}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <label
          htmlFor="auth-remember"
          className="flex items-center gap-2 text-[13px] text-[var(--auth-text)] cursor-pointer select-none"
        >
          <input
            id="auth-remember"
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="rounded border-[var(--auth-input-border)] text-[var(--auth-primary)] bg-[var(--auth-input-bg)] focus:ring-[var(--auth-input-focus)]"
          />
          Ingat saya
        </label>
      </div>

      <div className="relative">
        <svg
          className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--auth-muted)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <path d="M8 7h8a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1" />
        </svg>
        <input
          id="auth-password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!fieldErrors.password ? true : undefined}
          aria-describedby={fieldErrors.password ? "auth-password-error" : undefined}
          className={`w-full min-h-[44px] rounded-full pl-10 pr-14 py-2.5 text-sm text-[var(--auth-text)] bg-[var(--auth-input-bg)] border border-transparent placeholder-[var(--auth-muted)] focus:border-[var(--auth-input-focus)] focus:ring-2 focus:ring-[var(--auth-input-focus)] focus:ring-offset-0 disabled:opacity-55 transition-all ${fieldErrors.password ? "border-[var(--auth-error)] focus:ring-[var(--auth-error)]" : ""}`}
          placeholder="Masukkan kata sandi"
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          className="absolute right-3 top-3 p-1 text-[var(--auth-muted)] hover:text-[var(--auth-title)] transition-colors"
        >
          {showPassword ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            </svg>
          )}
        </button>
      </div>
      {fieldErrors.password ? (
        <p id="auth-password-error" className="mt-1 text-xs text-[var(--auth-error)]">
          {fieldErrors.password}
        </p>
      ) : null}

      {serverError ? (
        <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-[var(--auth-error-bg)] border border-[var(--auth-error)]/30 px-3 py-2 text-xs text-[var(--auth-error)]" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {serverError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full min-h-[46px] rounded-full bg-[var(--auth-primary)] text-[var(--auth-on-primary)] font-semibold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-55 disabled:cursor-not-allowed hover:bg-[var(--auth-primary-hover)]"
      >
        {pending ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 11-6.84-3.954 9.48 9.48 0 01-1.848 3.398" />
            </svg>
            Memproses…
          </>
        ) : (
          <>
            Masuk
            <span aria-hidden="true">→</span>
          </>
        )}
      </button>

      <div className="my-4 flex items-center gap-3">
        <span className="flex-1 h-[1px] bg-[var(--auth-input-border)]" />
        <span className="text-[11px] uppercase tracking-wider text-[var(--auth-muted)]">
          Belum terdaftar?
        </span>
        <span className="flex-1 h-[1px] bg-[var(--auth-input-border)]" />
      </div>

      <Link
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onSwitchToRegister();
        }}
        className="w-full min-h-[44px] rounded-full border border-[var(--auth-primary)] bg-transparent text-[var(--auth-primary)] font-semibold text-sm uppercase tracking-wider flex items-center justify-center transition-colors hover:bg-[var(--auth-primary)] hover:text-[var(--auth-on-primary)] disabled:opacity-55"
      >
        Buat akun wisatawan
      </Link>

      <p className="mt-4 text-center text-[12px] text-[var(--auth-muted)] leading-5">
        Pegawai Parangtritis?{" "}
        <Link
          href="/staff/login"
          className="font-semibold text-[var(--auth-link)] underline underline-offset-2 hover:text-[var(--auth-primary)]"
        >
          Masuk lewat portal operasi
        </Link>
      </p>
    </form>
  );
}
