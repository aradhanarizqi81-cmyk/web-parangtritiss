"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Field from "@/components/field";
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { User, ValidationErrors } from "@/lib/api/types";

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

    // Bentuk payload mengikuti RegisterRequest backend.
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
    <section className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold">Registrasi wisatawan</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Akun publik selalu dibuat dengan peran wisatawan.
      </p>

      {formError ? (
        <p
          role="alert"
          className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {formError}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <Field id="name" label="Nama lengkap" error={errors.name?.[0]}>
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
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
        </Field>

        <Field id="email" label="Email" error={errors.email?.[0]}>
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
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
        </Field>

        <Field
          id="phone"
          label="Nomor telepon"
          hint="Opsional."
          error={errors.phone?.[0]}
        >
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
        </Field>

        <Field
          id="password"
          label="Password"
          hint="Minimal 8 karakter."
          error={errors.password?.[0]}
        >
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "password-error" : undefined}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
        </Field>

        <Field
          id="password_confirmation"
          label="Ulangi password"
          error={errors.password_confirmation?.[0]}
        >
          <input
            id="password_confirmation"
            name="password_confirmation"
            type="password"
            autoComplete="new-password"
            required
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            aria-invalid={errors.password_confirmation ? true : undefined}
            aria-describedby={
              errors.password_confirmation
                ? "password_confirmation-error"
                : undefined
            }
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
        </Field>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {pending ? "Memproses…" : "Daftar"}
        </button>
      </form>

      <p className="mt-6 text-sm text-neutral-600">
        Sudah punya akun?{" "}
        <Link
          href="/login"
          className="font-medium text-emerald-800 hover:underline"
        >
          Masuk
        </Link>
      </p>
    </section>
  );
}
