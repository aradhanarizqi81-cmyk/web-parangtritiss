import os from "node:os";
import path from "node:path";

/**
 * Sumber tunggal konfigurasi QA: lokasi artefak, base URL, daftar viewport,
 * dan kredensial akun uji.
 *
 * Artefak diletakkan di direktori sementara OS supaya screenshot maupun cookie
 * sesi hasil login tidak pernah masuk ke repositori.
 */

export const ARTIFACTS_DIR =
  process.env.QA_ARTIFACTS_DIR ?? path.join(os.tmpdir(), "parangtritis-qa");

export const AUTH_DIR = path.join(ARTIFACTS_DIR, "auth");
export const SHOTS_DIR = path.join(ARTIFACTS_DIR, "screenshots");
export const MATRIX_DIR = path.join(ARTIFACTS_DIR, "matrix");

export const BASE_URL = process.env.QA_BASE_URL ?? "http://localhost:3000";

export type Viewport = { name: string; width: number; height: number };

export const VIEWPORTS: Viewport[] = [
  { name: "360x800", width: 360, height: 800 },
  { name: "375x812", width: 375, height: 812 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1920x1080", width: 1920, height: 1080 },
];

export type RoleKey = "visitor" | "admin" | "cashier" | "gate";

export const ROLES: RoleKey[] = ["visitor", "admin", "cashier", "gate"];

/**
 * Email default mengacu pada seeder lokal (database/seeders/RoleUserSeeder.php)
 * dan bukan rahasia. Password sengaja TIDAK ditulis di sini; hanya dibaca dari
 * env QA_PASSWORD saat menjalankan pengujian.
 */
export const ROLE_EMAILS: Record<RoleKey, string> = {
  visitor: process.env.QA_VISITOR_EMAIL ?? "visitor@parangtritis.test",
  admin: process.env.QA_ADMIN_EMAIL ?? "admin@parangtritis.test",
  cashier: process.env.QA_CASHIER_EMAIL ?? "cashier@parangtritis.test",
  gate: process.env.QA_GATE_EMAIL ?? "gate@parangtritis.test",
};

export function qaPassword(): string {
  const value = process.env.QA_PASSWORD;
  if (!value) {
    throw new Error(
      "QA_PASSWORD belum diset. Jalankan dengan QA_PASSWORD=<password akun uji " +
        "(lihat database/seeders/RoleUserSeeder.php).",
    );
  }
  return value;
}

export function authStatePath(role: RoleKey): string {
  return path.join(AUTH_DIR, `${role}.json`);
}
