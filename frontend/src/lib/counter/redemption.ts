import type { RedemptionState } from "./types";

/**
 * Nada tampilan meja penukaran. HANYA untuk pengalaman pengguna; keputusan nyata
 * tetap di backend melalui `can_redeem`, `can_reprint`, dan `block_reason`.
 *
 * Urutan penting: transaksi yang sudah ditukarkan selalu "redeemed" meski
 * `can_redeem` false, supaya petugas melihat tombol cetak ulang, bukan sekadar
 * penolakan.
 */
export type RedemptionTone = "redeemable" | "redeemed" | "blocked";

export function redemptionTone(state: RedemptionState): RedemptionTone {
  if (state.redeemed) return "redeemed";
  if (state.can_redeem) return "redeemable";
  return "blocked";
}

/**
 * Apakah sudah ada gelang yang pernah tercetak? Dibaca dari `printed_at` yang
 * dikirim backend — bukan dari asumsi frontend — supaya label cetak ulang
 * muncul setelah pencatatan cetak yang sebenarnya.
 */
export function hasPrintedTickets(
  tickets: { printed_at: string | null }[],
): boolean {
  return tickets.some((ticket) => ticket.printed_at !== null);
}

/**
 * Cetak ulang tidak pernah membuat tiket baru, penukaran ganda, maupun
 * check-in ganda; hanya status cetak dan audit yang diperbarui.
 */
export function wristbandButtonLabel(alreadyPrinted: boolean): string {
  return alreadyPrinted ? "Cetak Ulang Gelang" : "Cetak Gelang";
}
