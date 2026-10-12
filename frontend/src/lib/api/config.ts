// Konfigurasi API untuk sisi server Next.js.
//
// PENTING: modul ini hanya boleh diimpor oleh route handler dan server
// component. Token Sanctum tidak pernah dikirim ke browser, jadi base URL API
// sengaja tidak memakai prefix NEXT_PUBLIC_.

export const API_BASE_URL = (
  process.env.API_BASE_URL ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME ?? "parangtritis_token";

// Token Sanctum tidak punya masa kedaluwarsa default; cookie diberi batas
// agar sesi tidak menggantung tanpa batas.
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

// Flag Secure mengikuti NODE_ENV secara default, tetapi dapat ditimpa untuk
// pengujian lokal dengan `next start` di atas HTTP.
export const SESSION_COOKIE_SECURE = process.env.SESSION_COOKIE_SECURE
  ? process.env.SESSION_COOKIE_SECURE === "true"
  : process.env.NODE_ENV === "production";
