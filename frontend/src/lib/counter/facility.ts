import type { FacilityEntitlement } from "./types";

/**
 * Nada tampilan satu hak fasilitas. HANYA untuk pengalaman pengguna; keputusan
 * nyata tetap di backend melalui `can_claim` dan `block_reason`.
 *
 * Hak yang sudah diklaim selalu "redeemed" agar petugas melihat riwayatnya,
 * termasuk ketika transaksi kemudian dibatalkan. Hak yang masih tersedia tetapi
 * belum memenuhi syarat (belum check-in, tanggal salah) tampil "blocked".
 */
export type FacilityTone = "claimable" | "redeemed" | "blocked";

export function facilityTone(entitlement: FacilityEntitlement): FacilityTone {
  if (entitlement.status === "redeemed" || entitlement.redeemed_at !== null) {
    return "redeemed";
  }

  return entitlement.can_claim ? "claimable" : "blocked";
}

/**
 * Label tombol klaim memakai nama fasilitas agar satu meja dapat melayani
 * beberapa jenis fasilitas tanpa tombol yang ambigu.
 */
export function facilityClaimLabel(name: string | null): string {
  return name ? `Klaim ${name}` : "Klaim Fasilitas";
}

/**
 * Hanya hak yang benar-benar dapat diklaim sekarang. Dipakai untuk menghitung
 * berapa aksi yang tersedia, bukan untuk mengambil keputusan sendiri.
 */
export function claimableEntitlements(
  entitlements: FacilityEntitlement[],
): FacilityEntitlement[] {
  return entitlements.filter(
    (entitlement) => facilityTone(entitlement) === "claimable",
  );
}
