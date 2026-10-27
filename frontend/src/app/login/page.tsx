
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { User, ValidationErrors } from "@/lib/api/types";
import { staffDestination } from "@/lib/auth/roles";

const coastalBackground =
  "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=2400&q=85";

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
    <section className="relative isolate flex min-h-[720px] items-center justify-center overflow-hidden bg-[#163d39] px-4 py-12 sm:px-6 lg:min-h-[780px]">
      {/* Coastal photographic background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: `url("${coastalBackground}")` }}
      />

      {/* Natural, subdued overlays */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(11,37,34,0.40)_0%,rgba(11,37,34,0.48)_45%,rgba(11,37,34,0.76)_100%)]"
      />

      <div className="absolute inset-x-0 top-0 -z-10 h-36 bg-gradient-to-b from-black/20 to-transparent" />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_448px]">
        {/* Editorial introduction */}
        <div className="hidden max-w-xl text-white lg:block">
          <p className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#e8d9b8]">
            <span className="h-px w-10 bg-[#e8d9b8]" />
            Yogyakarta · Indonesia
          </p>

          <h1 className="font-serif text-6xl leading-[1.08] tracking-[-0.04em] xl:text-7xl">
            Temukan
            <br />
            ketenangan di
            <br />
            <span className="italic text-[#e8d9b8]">
              tepi selatan.
            </span>
          </h1>

          <p className="mt-7 max-w-md text-base leading-8 text-white/80">
            Mulai perjalananmu ke Pantai Parangtritis. Masuk ke akun untuk
            mengelola pendaftaran kunjungan dan informasi perjalananmu.
          </p>

          <div className="mt-12 flex items-center gap-4">
            <span className="h-px w-12 bg-white/60" />
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">
              Laut · Pasir · Pengalaman
            </p>
          </div>
        </div>

        {/* Login panel */}
        <div className="mx-auto w-full max-w-md rounded-2xl border border-white/60 bg-[#fbf9f3]/[0.97] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)] sm:p-7">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#315c51] transition hover:text-[#163d39]"
            >
              <span aria-hidden="true">←</span>
              Kembali ke beranda
            </Link>

            <div className="mt-8 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d9dfd2] bg-[#eef0e7] font-serif text-xl text-[#245247]">
                P
              </span>
              <div>
                <p className="font-serif text-lg leading-tight text-[#183d37]">
                  Pantai Parangtritis
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.19em] text-[#78857a]">
                  Visitor access
                </p>
              </div>
            </div>

            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-[#718073]">
              Selamat datang kembali
            </p>
            <h2 className="mt-2 font-serif text-4xl tracking-[-0.035em] text-[#183d37]">
              Masuk akun
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#69766d]">
              Masuk untuk melanjutkan pengelolaan kunjungan wisata.
            </p>

          {formError ? (
            <div
              role="alert"
              aria-live="polite"
              className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
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
                className="mb-2 block text-sm font-medium text-[#29483f]"
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
                className="min-h-12 w-full rounded-xl border border-[#d9ded4] bg-white px-4 py-3 text-sm text-[#183d37] outline-none transition placeholder:text-[#a0a89f] hover:border-[#aab9a9] focus:border-[#356d59] focus:ring-4 focus:ring-[#356d59]/10"
                placeholder="nama@email.com"
              />
              {errors.email?.[0] ? (
                <p
                  id="email-error"
                  className="mt-2 text-sm text-red-700"
                >
                  {errors.email[0]}
                </p>
              ) : null}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[#29483f]"
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
                className="min-h-12 w-full rounded-xl border border-[#d9ded4] bg-white px-4 py-3 text-sm text-[#183d37] outline-none transition placeholder:text-[#a0a89f] hover:border-[#aab9a9] focus:border-[#356d59] focus:ring-4 focus:ring-[#356d59]/10"
                placeholder="Masukkan password"
              />
              {errors.password?.[0] ? (
                <p
                  id="password-error"
                  className="mt-2 text-sm text-red-700"
                >
                  {errors.password[0]}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={pending}
              className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#24594b] px-5 py-3 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-[#19483c] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#356d59]/25 disabled:cursor-not-allowed disabled:opacity-60"
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
            <span className="h-px flex-1 bg-[#e2e3d9]" />
            <span className="text-[10px] uppercase tracking-[0.16em] text-[#92998f]">
              Belum terdaftar?
            </span>
            <span className="h-px flex-1 bg-[#e2e3d9]" />
          </div>

          <Link
            href="/register"
            className="flex min-h-12 w-full items-center justify-center rounded-xl border border-[#bfcbbd] px-5 py-3 text-sm font-semibold text-[#24594b] transition hover:border-[#24594b] hover:bg-[#edf0e8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#356d59]/15"
          >
            Buat akun wisatawan
          </Link>

          <p className="mt-7 text-center text-xs leading-5 text-[#899187]">
            Portal pendaftaran dan pengelolaan kunjungan wisatawan.
          </p>

          <p className="mt-4 text-center text-xs leading-5 text-[#899187]">
            Pegawai Parangtritis?{" "}
            <Link
              href="/staff/login"
              className="font-semibold text-[#24594b] underline decoration-[#c9b78f] underline-offset-4 transition-colors hover:text-[#19483c]"
            >
              Masuk lewat portal operasional
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
