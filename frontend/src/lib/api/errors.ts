import type { ApiErrorKind, ValidationErrors } from "./types";

export function kindForStatus(status: number): ApiErrorKind {
  if (status === 0) return "network";
  if (status === 422) return "validation";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status >= 500) return "server";
  return "unknown";
}

const FALLBACK_MESSAGES: Record<ApiErrorKind, string> = {
  validation: "Data yang dikirim tidak valid.",
  unauthorized: "Sesi Anda tidak valid. Silakan masuk kembali.",
  forbidden: "Anda tidak memiliki hak akses untuk tindakan ini.",
  not_found: "Data yang diminta tidak ditemukan.",
  server: "Terjadi gangguan pada server. Coba lagi sebentar lagi.",
  network: "Tidak dapat menghubungi server. Periksa koneksi Anda.",
  unknown: "Terjadi kesalahan yang tidak terduga.",
};

export function extractMessage(payload: unknown, status: number): string {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof (payload as { message: unknown }).message === "string" &&
    (payload as { message: string }).message.trim() !== ""
  ) {
    return (payload as { message: string }).message;
  }

  return FALLBACK_MESSAGES[kindForStatus(status)];
}

export function extractErrors(payload: unknown): ValidationErrors | undefined {
  if (
    payload &&
    typeof payload === "object" &&
    "errors" in payload &&
    payload.errors &&
    typeof payload.errors === "object"
  ) {
    return payload.errors as ValidationErrors;
  }

  return undefined;
}

export class ApiError extends Error {
  readonly status: number;
  readonly kind: ApiErrorKind;
  readonly errors?: ValidationErrors;

  constructor(init: {
    status: number;
    kind: ApiErrorKind;
    message: string;
    errors?: ValidationErrors;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.kind = init.kind;
    this.errors = init.errors;
  }
}
