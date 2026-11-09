"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Alert from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { inputClass } from "@/components/ui/input";
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
    <form onSubmit={onSubmit} method="post" noValidate className="mt-4">
      {formError ? (
        <div data-testid="staff-login-error" className="mb-6">
          <Alert tone="warning">{formError}</Alert>
        </div>
      ) : null}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-ivory/90"
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
          className={inputClass(
            "mt-2 rounded-full border-white/20 bg-white/5 text-ivory placeholder:text-ivory/50 focus:border-white focus:ring-white/25"
          )}
        />
        {emailError ? (
          <p id="email-error" role="alert" className="mt-1.5 text-sm text-danger">
            {emailError}
          </p>
        ) : null}
      </div>

      <div className="mt-5">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-ivory/90"
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
            className={inputClass(
              "pr-28 rounded-full border-white/20 bg-white/5 text-ivory placeholder:text-ivory/50 focus:border-white focus:ring-white/25"
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-controls="password"
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            className="absolute inset-y-0 right-0 my-1 mr-1 rounded-lg px-3 text-xs font-semibold text-ocean/70 transition-colors hover:bg-white/10 hover:text-ocean"
          >
            {showPassword ? "Sembunyikan" : "Tampilkan"}
          </button>
        </div>
        {passwordError ? (
          <p
            id="password-error"
            role="alert"
            className="mt-1.5 text-sm text-danger"
          >
            {passwordError}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className={buttonClasses({
          size: "lg",
          className: "mt-4 w-full bg-white text-foreground rounded-full hover:bg-white/90",
        })}
      >
        {pending ? (
          <>
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-2 border-ivory/35 border-t-ivory"
            />
            Memeriksa kredensial...
          </>
        ) : (
          "Masuk ke portal"
        )}
      </button>

      <div className="mt-5 border-t border-white/20 pt-5">
        <p className="text-xs leading-6 text-ivory/80">
          Anda wisatawan?{" "}
          <Link
            href="/login"
            className="font-semibold text-ocean underline decoration-line underline-offset-4 transition-colors hover:text-ocean/80"
          >
            Masuk melalui portal wisatawan
          </Link>
        </p>
      </div>
    </form>
  );
}
