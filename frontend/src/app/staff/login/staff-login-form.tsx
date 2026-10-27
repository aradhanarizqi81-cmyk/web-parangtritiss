"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { User, ValidationErrors } from "@/lib/api/types";
import { roleLabel, staffDestination } from "@/lib/auth/roles";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Form masuk portal operasional.
 *
 * Role tidak pernah dikirim dari form: identitas diverifikasi backend lewat
 * `POST /api/auth/login`, dan tujuan pengalihan dihitung dari role pada
 * respons yang sudah terverifikasi itu. Tidak ada URL pengalihan yang diterima
 * dari pengguna, sehingga tidak ada open redirect.
 */
export default function StaffLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const emailError = errors.email?.[0];
  const passwordError = errors.password?.[0];

  function validate(): ValidationErrors {
    const found: ValidationErrors = {};
    const value = email.trim();

    if (value === "") {
      found.email = ["Email wajib diisi."];
    } else if (!EMAIL_PATTERN.test(value)) {
      found.email = ["Format email tidak valid."];
    }

    if (password === "") {
      found.password = ["Password wajib diisi."];
    }

    return found;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found = validate();

    if (Object.keys(found).length > 0) {
      setErrors(found);
      setFormError(null);
      return;
    }

    setPending(true);
    setErrors({});
    setFormError(null);

    try {
      const response = await apiRequest<{ data: User }>("/api/auth/login", {
        email: email.trim(),
        password,
      });

      const destination = staffDestination(response.data.role);

      if (!destination) {
        // Backend sudah membuat sesi sebelum role diketahui di sini. Cabut
        // dulu supaya akun wisatawan tidak tertinggal dalam keadaan setengah
        // masuk hanya karena mencoba lewat portal operasional.
        try {
          await apiRequest("/api/auth/logout", {});
        } catch {
          // Penolakan tetap ditampilkan walau pencabutan sesi gagal.
        }

        setFormError(
          `Akun ini terdaftar sebagai ${roleLabel(response.data.role)}, sehingga tidak dapat memakai portal operasional. Silakan masuk lewat portal wisatawan.`,
        );
        setPending(false);
        return;
      }

      router.replace(destination);
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
    <form onSubmit={onSubmit} method="post" noValidate className="mt-8">
      {formError ? (
        <div
          role="alert"
          data-testid="staff-login-error"
          className="mb-6 border-l-2 border-[#a8743f] bg-[#f5ece1] px-4 py-3 text-sm leading-6 text-[#7a4f24]"
        >
          {formError}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-[#193d38]"
        >
          Email dinas
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "email-error" : undefined}
          className="mt-2 block w-full rounded-lg border border-[#dcd8cc] bg-white px-3.5 py-2.5 text-sm text-[#193d38] outline-none transition focus:border-[#193d38] focus:ring-4 focus:ring-[#193d38]/10"
        />
        {emailError ? (
          <p
            id="email-error"
            role="alert"
            className="mt-1.5 text-sm text-[#a3301e]"
          >
            {emailError}
          </p>
        ) : null}
      </div>

      <div className="mt-5">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-[#193d38]"
        >
          Password
        </label>
        <div className="relative mt-2">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={passwordError ? true : undefined}
            aria-describedby={passwordError ? "password-error" : undefined}
            className="block w-full rounded-lg border border-[#dcd8cc] bg-white py-2.5 pl-3.5 pr-28 text-sm text-[#193d38] outline-none transition focus:border-[#193d38] focus:ring-4 focus:ring-[#193d38]/10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-controls="password"
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            className="absolute inset-y-0 right-0 my-1 mr-1 rounded-md px-3 text-xs font-semibold text-[#657168] transition-colors hover:bg-[#f0ece2] hover:text-[#193d38]"
          >
            {showPassword ? "Sembunyikan" : "Tampilkan"}
          </button>
        </div>
        {passwordError ? (
          <p
            id="password-error"
            role="alert"
            className="mt-1.5 text-sm text-[#a3301e]"
          >
            {passwordError}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full bg-[#193d38] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#28564d] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? (
          <>
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white"
            />
            Memeriksa kredensial…
          </>
        ) : (
          "Masuk ke portal"
        )}
      </button>

      <div className="mt-6 border-t border-[#e4e0d5] pt-5">
        <p className="text-xs leading-6 text-[#78816d]">
          Anda wisatawan?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#193d38] underline decoration-[#b6a17b] underline-offset-4 transition-colors hover:text-[#28564d]"
          >
            Masuk melalui portal wisatawan
          </Link>
        </p>
      </div>
    </form>
  );
}
