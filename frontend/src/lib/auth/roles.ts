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
