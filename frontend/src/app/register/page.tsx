
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { User, ValidationErrors } from "@/lib/api/types";

const coastalBackground =
  "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=2400&q=85";

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
    <section className="relative isolate flex min-h-[760px] items-center justify-center overflow-hidden bg-[#163d39] px-4 py-10 sm:px-6 lg:min-h-[840px]">
      {/* Coastal photographic background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: `url("${coastalBackground}")` }}
      />

      {/* Keep the form readable over the photography */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(11,37,34,0.40)_0%,rgba(11,37,34,0.52)_45%,rgba(11,37,34,0.78)_100%)]"
      />

      <div className="absolute inset-x-0 top-0 -z-10 h-36 bg-gradient-to-b from-black/20 to-transparent" />

      <div className="mx-auto w-full max-w-5xl">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-white/60 bg-[#fbf9f3]/[0.97] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)] sm:p-7">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#315c51] transition hover:text-[#163d39]"
            >
              <span aria-hidden="true">←</span>
              Kembali ke beranda
            </Link>

            <div className="mt-7 flex items-center gap-3">
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

            <p className="mt-7 text-xs font-semibold uppercase tracking-[0.22em] text-[#718073]">
              Mulai perjalananmu
            </p>
            <h1 className="mt-2 font-serif text-4xl tracking-[-0.035em] text-[#183d37] sm:text-[2.75rem]">
              Buat akun wisatawan
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#69766d]">
              Daftarkan akun untuk memulai pendaftaran kunjungan dan mengelola
              informasi perjalananmu.
            </p>
          </div>

          {formError ? (
            <div
              role="alert"
              aria-live="polite"
              className="mt-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
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
                className="mb-2 block text-sm font-medium text-[#29483f]"
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
                className="min-h-12 w-full rounded-xl border border-[#d9ded4] bg-white px-4 py-3 text-sm text-[#183d37] outline-none transition placeholder:text-[#a0a89f] hover:border-[#aab9a9] focus:border-[#356d59] focus:ring-4 focus:ring-[#356d59]/10"
                placeholder="Nama sesuai identitas"
              />
              {errors.name?.[0] ? (
                <p id="name-error" className="mt-2 text-sm text-red-700">
                  {errors.name[0]}
                </p>
              ) : null}
            </div>

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
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? "email-error" : undefined}
                className="min-h-12 w-full rounded-xl border border-[#d9ded4] bg-white px-4 py-3 text-sm text-[#183d37] outline-none transition placeholder:text-[#a0a89f] hover:border-[#aab9a9] focus:border-[#356d59] focus:ring-4 focus:ring-[#356d59]/10"
                placeholder="nama@email.com"
              />
              {errors.email?.[0] ? (
                <p id="email-error" className="mt-2 text-sm text-red-700">
                  {errors.email[0]}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-2 flex items-center gap-2 text-sm font-medium text-[#29483f]"
              >
                Nomor telepon
                <span className="text-xs font-normal text-[#899187]">
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
                className="min-h-12 w-full rounded-xl border border-[#d9ded4] bg-white px-4 py-3 text-sm text-[#183d37] outline-none transition placeholder:text-[#a0a89f] hover:border-[#aab9a9] focus:border-[#356d59] focus:ring-4 focus:ring-[#356d59]/10"
                placeholder="Contoh: 08xxxxxxxxxx"
              />
              {errors.phone?.[0] ? (
                <p id="phone-error" className="mt-2 text-sm text-red-700">
                  {errors.phone[0]}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-[#29483f]"
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
                className="min-h-12 w-full rounded-xl border border-[#d9ded4] bg-white px-4 py-3 text-sm text-[#183d37] outline-none transition placeholder:text-[#a0a89f] hover:border-[#aab9a9] focus:border-[#356d59] focus:ring-4 focus:ring-[#356d59]/10"
                placeholder="Minimal 8 karakter"
              />
              <p className="mt-2 text-xs leading-5 text-[#899187]">
                Gunakan password yang kuat dan tidak mudah ditebak.
              </p>
              {errors.password?.[0] ? (
                <p id="password-error" className="mt-2 text-sm text-red-700">
                  {errors.password[0]}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="password_confirmation"
                className="mb-2 block text-sm font-medium text-[#29483f]"
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
                className="min-h-12 w-full rounded-xl border border-[#d9ded4] bg-white px-4 py-3 text-sm text-[#183d37] outline-none transition placeholder:text-[#a0a89f] hover:border-[#aab9a9] focus:border-[#356d59] focus:ring-4 focus:ring-[#356d59]/10"
                placeholder="Masukkan ulang password"
              />
              {errors.password_confirmation?.[0] ? (
                <p
                  id="password_confirmation-error"
                  className="mt-2 text-sm text-red-700"
                >
                  {errors.password_confirmation[0]}
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
                  Buat akun
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <span className="h-px flex-1 bg-[#e2e3d9]" />
            <span className="text-[10px] uppercase tracking-[0.16em] text-[#92998f]">
              Sudah punya akun?
            </span>
            <span className="h-px flex-1 bg-[#e2e3d9]" />
          </div>

          <Link
            href="/login"
            className="flex min-h-12 w-full items-center justify-center rounded-xl border border-[#bfcbbd] px-5 py-3 text-sm font-semibold text-[#24594b] transition hover:border-[#24594b] hover:bg-[#edf0e8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#356d59]/15"
          >
            Masuk ke akun
          </Link>

          <p className="mt-6 text-center text-xs leading-5 text-[#899187]">
            Dengan membuat akun, kamu dapat mengakses layanan pendaftaran
            kunjungan wisatawan.
          </p>
        </div>
      </div>
    </section>
  );
}
