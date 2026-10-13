/**
 * Nada tampilan untuk hasil validasi gerbang. Ini HANYA untuk pengalaman
 * pengguna; backend tetap sumber kebenaran status dan alasannya.
 */

export type GateTone = "success" | "used" | "rejected";

/**
 * Memetakan status HTTP respons gerbang ke nada tampilan. `201` berarti check-in
 * baru berhasil; `409` berarti tiket sudah pernah dipakai; selain itu ditolak.
 */
export function gateTone(status: number): GateTone {
  if (status === 201) return "success";
  if (status === 409) return "used";
  return "rejected";
}
