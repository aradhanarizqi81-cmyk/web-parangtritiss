"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { User, ValidationErrors } from "@/lib/api/types";
import { staffDestination } from "@/lib/auth/roles";
import AuthShell from "@/components/layout/auth-shell";

/* Sama dengan halaman home: video HD dan poster Unsplash */
const AUTH_VIDEO_SRC = "/videos/From Klickpin.com- 12 Classy.mp4";
const AUTH_POSTER =
  "https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?auto=format&fit=crop&w=2400&q=85";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setFormError(null);

    try {
      const response = await apiRequest<{ data: User }>("/api/auth/login", {
        email,
        password,
      });

      const destination = staffDestination(response.data.role);
      if (destination) {
        router.replace(destination);
        router.refresh();
        return;
      }

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
      poster={AUTH_POSTER}
      overlayClass="from-teal-950/50 via-teal-900/30 to-teal-800/15"
      showEditorial={true}
      staffMode={false}
      brandLabel="Akses wisatawan"
    >
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
        Selamat datang kembali
      </p>
      <h2 className="mt-2 font-raleway text-4xl tracking-[-0.035em] text-white">
        Masuk akun
      </h2>
      <p className="mt-3 text-sm leading-6 text-white/80">
        Masuk untuk melanjutkan pengelolaan kunjungan wisata.
      </p>

      {formError ? (
        <div
          role="alert"
          aria-live="polite"
          className="mb-5 flex gap-3 rounded-xl border border-teal-200/30 bg-red-500/20 px-4 py-3 text-sm leading-6 text-red-100"
        >
          <span aria-hidden="true" className="font-semibold">
            !
          </span>
          <p>{formError}</p>
        </div>
      ) : null}

      <form onSubmit={onSubmit} method="post" className="space-y-5" noValidate>
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
            autoFocus={false}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            className="min-h-12 w-full rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400/25 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="nama@email.com"
          />
          {errors.email?.[0] ? (
            <p
              id="email-error"
              className="mt-2 text-sm text-red-400"
            >
              {errors.email[0]}
            </p>
          ) : null}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-white/90"
            >
              Password
            </label>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={
              errors.password ? "password-error" : undefined
            }
            className="min-h-12 w-full rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/50 focus:border-teal-400 focus:ring-teal-400/25 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Masukkan password"
          />
          {errors.password?.[0] ? (
            <p
              id="password-error"
              className="mt-2 text-sm text-red-400"
            >
              {errors.password[0]}
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
              Masuk ke akun
              <span aria-hidden="true">→</span>
            </>
          )}
        </button>
      </form>

      <div className="my-7 flex items-center gap-4">
        <span className="h-px flex-1 bg-white/20" />
        <span className="text-[10px] uppercase tracking-[0.16em] text-white/60">
          Belum terdaftar?
        </span>
        <span className="h-px flex-1 bg-white/20" />
      </div>

      <Link
        href="/register"
        className="flex min-h-12 w-full items-center justify-center rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:border-teal-400 hover:bg-teal-500/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-400/15"
      >
        Buat akun wisatawan
      </Link>

      <p className="mt-7 text-center text-xs leading-5 text-white/60">
        Portal pendaftaran dan pengelolaan kunjungan wisatawan.
      </p>

      <p className="mt-4 text-center text-xs leading-5 text-white/60">
        Pegawai Parangtritis?{" "}
        <Link
          href="/staff/login"
          className="font-semibold text-teal-300 underline decoration-line underline-offset-4 transition-colors hover:text-teal-100"
        >
          Masuk lewat portal operasional
        </Link>
      </p>
    </AuthShell>
  );
}
