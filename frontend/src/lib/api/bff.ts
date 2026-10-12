import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/api/origin";
import { laravelFetch } from "@/lib/api/server";
import type { ApiResult } from "@/lib/api/types";
import { getSessionToken } from "@/lib/auth/session";

type BffOptions = {
  method?: "GET" | "POST";
  body?: unknown;
};

/**
 * Meneruskan permintaan same-origin dari browser ke Laravel memakai token
 * sesi HttpOnly.
 *
 * - Permintaan yang mengubah data wajib lolos pemeriksaan origin (anti-CSRF).
 * - Tanpa cookie sesi, jawabannya 401 dan Laravel tidak dipanggil.
 * - Token tidak pernah dikembalikan ke browser; hanya payload Laravel yang
 *   diteruskan, beserta status HTTP aslinya.
 */
export async function forwardToLaravel<T>(
  request: Request,
  path: string,
  { method = "GET", body }: BffOptions = {},
): Promise<NextResponse> {
  if (method !== "GET" && !isSameOrigin(request)) {
    return NextResponse.json(
      { message: "Permintaan ditolak." },
      { status: 403 },
    );
  }

  const token = await getSessionToken();

  if (!token) {
    return NextResponse.json(
      { message: "Sesi Anda tidak valid. Silakan masuk kembali." },
      { status: 401 },
    );
  }

  const result: ApiResult<T> = await laravelFetch<T>(path, {
    method,
    body,
    token,
  });

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message, errors: result.errors },
      { status: result.status || 502 },
    );
  }

  return NextResponse.json(result.data, { status: result.status });
}

/**
 * Membaca body JSON dan menolak bentuk yang tidak valid sebelum diteruskan.
 */
export async function readJsonBody(
  request: Request,
): Promise<Record<string, unknown> | null> {
  const body = await request.json().catch(() => null);

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  return body as Record<string, unknown>;
}
