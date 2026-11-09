"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { User, ValidationErrors } from "@/lib/api/types";
import AuthShell from "@/components/layout/auth-shell";

/* Sama dengan halaman home: video HD dan poster Unsplash */
const AUTH_VIDEO_SRC = "/videos/From Klickpin.com- 12 Classy.mp4";
const AUTH_POSTER =
  "https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?auto=format&fit=crop&w=2400&q=85";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setFormError(null);

    const payload: Record<string, string> = {
      name,
      email,
      password,
      password_confirmation: passwordConfirmation,
    };

    if (phone.trim() !== "") {
      payload.phone = phone.trim();
    }

    try {
      await apiRequest<{ data: User }>("/api/auth/register", payload);

      router.replace("/profile");
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

  return (
    <AuthShell
      videoSrc={AUTH_VIDEO_SRC}
      poster="/images/auth-poster.jpg"
      overlayClass="from-teal-950/50 via-teal-900/30 to-teal-800/15"
      showEditorial={false}
      staffMode={false}
      brandLabel="Daftar wisatawan"
    >
      <p className="mt-7 text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
        Mulai perjalananmu
      </p>
      <h1 className="mt-2 font-raleway text-4xl tracking-[-0.035em] text-white sm:text-[2.75rem]">
        Buat akun wisatawan
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-white/80">
        Daftarkan akun untuk memulai pendaftaran kunjungan dan mengelola
        informasi perjalananmu.
      </p>

      {formError ? (
        <div
          role="alert"
          aria-live="polite"
          className="mt-6 flex gap-3 rounded-xl border border-teal-200/30 bg-red-500/20 px-4 py-3 text-sm leading-6 text-red-100"
        >
          <span aria-hidden="true" className="font-semibold">
            !
          </span>
          <p>{formError}</p>
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="mt-7 space-y-4"
        noValidate
      >
        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-medium text-white/90"
          >
            Nama lengkap
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "name-error" : undefined}
            className="min-h-12 w-full rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400/25 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Nama sesuai identitas"
          />
          {errors.name?.[0] ? (
            <p id="name-error" className="mt-2 text-sm text-red-400">
              {errors.name[0]}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-white/90"
          >
            Alamat email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            className="min-h-12 w-full rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400/25 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="nama@email.com"
          />
          {errors.email?.[0] ? (
            <p id="email-error" className="mt-2 text-sm text-red-400">
              {errors.email[0]}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="phone"
            className="mb-2 flex items-center gap-2 text-sm font-medium text-white/90"
          >
            Nomor telepon
            <span className="text-xs font-normal text-white/50">
              (opsional)
            </span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            className="min-h-12 w-full rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400/25 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Contoh: 08xxxxxxxxxx"
          />
          {errors.phone?.[0] ? (
            <p id="phone-error" className="mt-2 text-sm text-red-400">
              {errors.phone[0]}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-white/90"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={
              errors.password ? "password-error" : undefined
            }
            className="min-h-12 w-full rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400/25 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Minimal 8 karakter"
          />
          <p className="mt-2 text-xs leading-5 text-white/50">
            Gunakan password yang kuat dan tidak mudah ditebak.
          </p>
          {errors.password?.[0] ? (
            <p id="password-error" className="mt-2 text-sm text-red-400">
              {errors.password[0]}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="password_confirmation"
            className="mb-2 block text-sm font-medium text-white/90"
          >
            Konfirmasi password
          </label>
          <input
            id="password_confirmation"
            name="password_confirmation"
            type="password"
            autoComplete="new-password"
            required
            value={passwordConfirmation}
            onChange={(event) =>
              setPasswordConfirmation(event.target.value)
            }
            aria-invalid={
              errors.password_confirmation ? true : undefined
            }
            aria-describedby={
              errors.password_confirmation
                ? "password_confirmation-error"
                : undefined
            }
            className="min-h-12 w-full rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400/25 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Masukkan ulang password"
          />
          {errors.password_confirmation?.[0] ? (
            <p
              id="password_confirmation-error"
              className="mt-2 text-sm text-red-400"
            >
              {errors.password_confirmation[0]}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-400/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <>
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
              Memproses...
            </>
          ) : (
            <>
              Buat akun
              <span aria-hidden="true">→</span>
            </>
          )}
        </button>
      </form>

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-white/20" />
        <span className="text-[10px] uppercase tracking-[0.16em] text-white/60">
          Sudah punya akun?
        </span>
        <span className="h-px flex-1 bg-white/20" />
      </div>

      <Link
        href="/login"
        className="flex min-h-12 w-full items-center justify-center rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:border-teal-400 hover:bg-teal-500/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-400/15"
      >
        Masuk ke akun
      </Link>

      <p className="mt-6 text-center text-xs leading-5 text-white/60">
        Dengan membuat akun, kamu dapat mengakses layanan pendaftaran
        kunjungan wisatawan.
      </p>
    </AuthShell>
  );
}
