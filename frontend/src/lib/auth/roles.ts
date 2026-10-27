import type { Role } from "@/lib/api/types";

export const ROLE_LABELS: Record<Role, string> = {
  visitor: "Wisatawan",
  admin: "Administrator",
  cashier: "Petugas Loket",
  gate_staff: "Petugas Gerbang",
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role] ?? role;
}

/**
 * Tampilan berbasis role hanya untuk pengalaman pengguna. Otorisasi sebenarnya
 * tetap ditegakkan di backend.
 */
export function isStaffRole(role: Role): boolean {
  return role !== "visitor";
}

/**
 * Peran yang boleh membuka halaman loket. Ini hanya gerbang tampilan; backend
 * tetap menolak peran lain lewat middleware `role:cashier,admin` + policy.
 */
export function canUseCounter(role: Role): boolean {
  return role === "cashier" || role === "admin";
}

/**
 * Peran yang boleh membuka area booking. Wisatawan membuat dan membayar
 * booking; admin hanya melihat daftarnya (read-only). Ini hanya gerbang
 * tampilan; backend menegakkan otorisasi lewat policy.
 */
export function canUseBooking(role: Role): boolean {
  return role === "visitor" || role === "admin";
}

/**
 * Peran yang boleh melakukan validasi di gerbang. Ini hanya gerbang tampilan;
 * backend menegakkan otorisasi lewat middleware `role:gate_staff,admin` dan
 * policy.
 */
export function canUseGate(role: Role): boolean {
  return role === "gate_staff" || role === "admin";
}

/**
 * Hanya wisatawan yang boleh membuat atau membayar booking.
 */
export function isVisitor(role: Role): boolean {
  return role === "visitor";
}

/**
 * Peran yang boleh membuka dashboard & laporan. Ini hanya gerbang tampilan;
 * backend membatasi seluruh endpoint `/api/v1/admin/*` ke administrator lewat
 * middleware `role:admin` + policy.
 */
export function canUseDashboard(role: Role): boolean {
  return role === "admin";
}

/**
 * Tujuan setelah masuk lewat portal operasional.
 *
 * Pemetaan ini hanya menerjemahkan identitas yang SUDAH diverifikasi backend
 * (role pada respons login atau `/auth/me`) menjadi halaman yang hak aksesnya
 * memang dimiliki peran tersebut. `null` berarti akun itu bukan pegawai dan
 * harus ditolak dari portal operasional.
 *
 * Role tidak pernah dibaca dari input form, dan fungsi ini tidak menerima URL
 * dari pengguna, sehingga tidak ada pengalihan terbuka.
 */
export function staffDestination(role: Role): string | null {
  switch (role) {
    case "admin":
      return "/admin";
    case "cashier":
      return "/counter";
    case "gate_staff":
      return "/gate";
    default:
      return null;
  }
}
