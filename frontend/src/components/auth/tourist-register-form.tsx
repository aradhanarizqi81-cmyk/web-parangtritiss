"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

interface TouristRegisterFormProps {
  onSwitchToLogin: () => void;
  firstFocusableRef: React.RefObject<HTMLElement | null>;
  lastFocusableRef: React.RefObject<HTMLElement | null>;
}

export default function TouristRegisterForm({
  onSwitchToLogin,
  firstFocusableRef,
  lastFocusableRef,
}: TouristRegisterFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFieldErrors({});
      setServerError(null);

      let valid = true;
      if (!name.trim()) {
        setFieldErrors((p) => ({ ...p, name: "Nama lengkap wajib diisi." }));
        valid = false;
      }
      if (!email.trim()) {
        setFieldErrors((p) => ({ ...p, email: "Alamat email wajib diisi." }));
        valid = false;
      }
      if (!password) {
        setFieldErrors((p) => ({ ...p, password: "Kata sandi wajib diisi." }));
        valid = false;
      }
      if (password && !confirmPassword) {
        setFieldErrors((p) => ({ ...p, confirm: "Konfirmasi kata sandi wajib diisi." }));
        valid = false;
      }
      if (password && confirmPassword && password !== confirmPassword) {
        setFieldErrors((p) => ({ ...p, confirm: "Kata sandi tidak cocok." }));
        valid = false;
      }
      if (!agree) {
        setFieldErrors((p) => ({ ...p, agree: "Anda harus menyetujui syarat & ketentuan." }));
        valid = false;
      }
      if (!valid) return;

      setPending(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      } catch {
        setServerError("Gagal membuat akun. Coba lagi nanti.");
      } finally {
        setPending(false);
      }
    },
    [name, email, phone, password, confirmPassword, agree]
  );

  const inputError = (key: string) => fieldErrors[key];

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <label
        htmlFor="auth-reg-name"
        className="text-[13px] font-medium text-[var(--auth-text)]"
      >
        Nama lengkap
      </label>
      <input
        id="auth-reg-name"
        name="name"
        type="text"
        autoComplete="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-invalid={!!inputError("name") ? true : undefined}
        aria-describedby={inputError("name") ? "auth-reg-name-error" : undefined}
        className={`w-full min-h-[44px] rounded-full pl-4 py-2.5 text-sm text-[var(--auth-text)] bg-[var(--auth-input-bg)] border border-transparent placeholder-[var(--auth-muted)] focus:border-[var(--auth-input-focus)] focus:ring-2 focus:ring-[var(--auth-input-focus)] focus:ring-offset-0 disabled:opacity-55 transition-all ${inputError("name") ? "border-[var(--auth-error)] focus:ring-[var(--auth-error)]" : ""}`}
        placeholder="Nama sesuai identitas"
        ref={firstFocusableRef as React.RefObject<HTMLInputElement>}
      />
      {inputError("name") ? (
        <p id="auth-reg-name-error" className="mt-1 text-xs text-[var(--auth-error)]">
          {inputError("name")}
        </p>
      ) : null}

      <label
        htmlFor="auth-reg-email"
        className="text-[13px] font-medium text-[var(--auth-text)]"
      >
        Alamat email
      </label>
      <div className="relative">
        <svg
          className="absolute left-3 top-3 h-4 w-4 text-[var(--auth-muted)]"
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
          id="auth-reg-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!inputError("email") ? true : undefined}
          aria-describedby={inputError("email") ? "auth-reg-email-error" : undefined}
          className={`w-full min-h-[44px] rounded-full pl-10 pr-4 py-2.5 text-sm text-[var(--auth-text)] bg-[var(--auth-input-bg)] border border-transparent placeholder-[var(--auth-muted)] focus:border-[var(--auth-input-focus)] focus:ring-2 focus:ring-[var(--auth-input-focus)] focus:ring-offset-0 disabled:opacity-55 transition-all ${inputError("email") ? "border-[var(--auth-error)] focus:ring-[var(--auth-error)]" : ""}`}
          placeholder="nama@email.com"
        />
      </div>
      {inputError("email") ? (
        <p id="auth-reg-email-error" className="mt-1 text-xs text-[var(--auth-error)]">
          {inputError("email")}
        </p>
      ) : null}

      <label
        htmlFor="auth-reg-phone"
        className="text-[13px] font-medium text-[var(--auth-text)]"
      >
        Nomor telepon
      </label>
      <input
        id="auth-reg-phone"
        name="phone"
        type="tel"
        autoComplete="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        aria-invalid={!!inputError("phone") ? true : undefined}
        aria-describedby={inputError("phone") ? "auth-reg-phone-error" : undefined}
        className={`w-full min-h-[44px] rounded-full pl-4 py-2.5 text-sm text-[var(--auth-text)] bg-[var(--auth-input-bg)] border border-transparent placeholder-[var(--auth-muted)] focus:border-[var(--auth-input-focus)] focus:ring-2 focus:ring-[var(--auth-input-focus)] focus:ring-offset-0 disabled:opacity-55 transition-all ${inputError("phone") ? "border-[var(--auth-error)] focus:ring-[var(--auth-error)]" : ""}`}
        placeholder="Contoh: 08xxxxxxxxxx"
      />
      {inputError("phone") ? (
        <p id="auth-reg-phone-error" className="mt-1 text-xs text-[var(--auth-error)]">
          {inputError("phone")}
        </p>
      ) : null}

      <label
        htmlFor="auth-reg-password"
        className="text-[13px] font-medium text-[var(--auth-text)]"
      >
        Kata sandi
      </label>
      <div className="relative">
        <svg
          className="absolute left-3 top-3 h-4 w-4 text-[var(--auth-muted)]"
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
          id="auth-reg-password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!inputError("password") ? true : undefined}
          aria-describedby={inputError("password") ? "auth-reg-password-error" : undefined}
          className={`w-full min-h-[44px] rounded-full pl-10 pr-14 py-2.5 text-sm text-[var(--auth-text)] bg-[var(--auth-input-bg)] border border-transparent placeholder-[var(--auth-muted)] focus:border-[var(--auth-input-focus)] focus:ring-2 focus:ring-[var(--auth-input-focus)] focus:ring-offset-0 disabled:opacity-55 transition-all ${inputError("password") ? "border-[var(--auth-error)] focus:ring-[var(--auth-error)]" : ""}`}
          placeholder="Minimal 8 karakter"
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
      {inputError("password") ? (
        <p id="auth-reg-password-error" className="mt-1 text-xs text-[var(--auth-error)]">
          {inputError("password")}
        </p>
      ) : null}

      <label
        htmlFor="auth-reg-confirm"
        className="text-[13px] font-medium text-[var(--auth-text)]"
      >
        Konfirmasi kata sandi
      </label>
      <input
        id="auth-reg-confirm"
        name="confirm"
        type={showPassword ? "text" : "password"}
        autoComplete="new-password"
        required
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        aria-invalid={!!inputError("confirm") ? true : undefined}
        aria-describedby={inputError("confirm") ? "auth-reg-confirm-error" : undefined}
        className={`w-full min-h-[44px] rounded-full pl-4 py-2.5 text-sm text-[var(--auth-text)] bg-[var(--auth-input-bg)] border border-transparent placeholder-[var(--auth-muted)] focus:border-[var(--auth-input-focus)] focus:ring-2 focus:ring-[var(--auth-input-focus)] focus:ring-offset-0 disabled:opacity-55 transition-all ${inputError("confirm") ? "border-[var(--auth-error)] focus:ring-[var(--auth-error)]" : ""}`}
        placeholder="Masukkan ulang kata sandi"
      />
      {inputError("confirm") ? (
        <p id="auth-reg-confirm-error" className="mt-1 text-xs text-[var(--auth-error)]">
          {inputError("confirm")}
        </p>
      ) : null}

      <div className="flex items-start gap-2">
        <input
          id="auth-reg-agree"
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          required
          className="mt-0.5 rounded border-[var(--auth-input-border)] text-[var(--auth-primary)] bg-[var(--auth-input-bg)] focus:ring-[var(--auth-input-focus)]"
        />
        <label
          htmlFor="auth-reg-agree"
          className="text-[13px] text-[var(--auth-text)] leading-5 cursor-pointer select-none"
        >
          Saya setuju dengan syarat &amp; ketentuan.
        </label>
      </div>
      {inputError("agree") ? (
        <p className="mt-1 text-xs text-[var(--auth-error)]">
          {inputError("agree")}
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
        disabled={pending || !agree}
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
            Membuat…
          </>
        ) : (
          <>
            Buat akun
            <span aria-hidden="true">→</span>
          </>
        )}
      </button>

      <div className="my-4 flex items-center gap-3">
        <span className="flex-1 h-[1px] bg-[var(--auth-input-border)]" />
        <span className="text-[11px] uppercase tracking-wider text-[var(--auth-muted)]">
          Sudah punya akun?
        </span>
        <span className="flex-1 h-[1px] bg-[var(--auth-input-border)]" />
      </div>

      <p className="text-center text-[13px] text-[var(--auth-text)] leading-5">
        Sudah punya akun?{" "}
        <Link
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onSwitchToLogin();
          }}
          className="font-semibold text-[var(--auth-link)] underline underline-offset-2 hover:text-[var(--auth-primary)]"
        >
          Masuk
        </Link>
      </p>
    </form>
  );
}
