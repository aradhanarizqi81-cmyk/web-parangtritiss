/**
 * Gerbang tampilan untuk aksi booking. Ini HANYA untuk pengalaman pengguna;
 * backend tetap sumber kebenaran dan menolak aksi yang tidak valid (409 untuk
 * pembayaran yang sudah selesai, 422 untuk cetak sebelum lunas).
 */

export function canSimulatePayment(status: string): boolean {
  return status === "pending";
}

export function canPrintTickets(status: string): boolean {
  return status === "paid" || status === "checked_in";
}

/**
 * Kode penukaran (QR loket) hanya boleh tampil setelah pembayaran sukses.
 * Backend juga menahan tokennya sampai lunas, jadi ini baris pertahanan
 * kedua — bukan satu-satunya.
 */
export function canShowRedemptionCode(token: string | null): boolean {
  return typeof token === "string" && token.length > 0;
}
