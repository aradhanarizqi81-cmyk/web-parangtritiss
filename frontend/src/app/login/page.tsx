"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Field from "@/components/field";
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { User, ValidationErrors } from "@/lib/api/types";

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
      await apiRequest<{ data: User }>("/api/auth/login", { email, password });
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
      <h1 className="text-2xl font-semibold">Masuk</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Gunakan akun yang sudah terdaftar.
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

        <Field id="password" label="Password" error={errors.password?.[0]}>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "password-error" : undefined}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
        </Field>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {pending ? "Memproses…" : "Masuk"}
        </button>
      </form>

      <p className="mt-6 text-sm text-neutral-600">
        Belum punya akun?{" "}
        <Link
          href="/register"
          className="font-medium text-emerald-800 hover:underline"
        >
          Daftar
        </Link>
      </p>
    </section>
  );
}
