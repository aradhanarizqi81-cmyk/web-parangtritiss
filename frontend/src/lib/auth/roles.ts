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
 * Hanya wisatawan yang boleh membuat atau membayar booking.
 */
export function isVisitor(role: Role): boolean {
  return role === "visitor";
}
