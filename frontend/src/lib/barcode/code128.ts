/**
 * Encoder Code128-B tanpa dependency untuk barcode grup gerbang.
 *
 * Barcode transaksi merepresentasikan satu transaksi/rombongan; nilainya adalah
 * `transactions.barcode_token` (opaque, 40 karakter alfanumerik, tanpa data
 * pribadi). Code128-B dipilih karena mendukung seluruh karakter ASCII yang
 * dipakai token tanpa mengubah huruf besar/kecil.
 *
 * Referensi: spesifikasi Code 128 (set B, start code 104).
 */

/** Pola modul Code128 untuk nilai 0..106 (11 modul; stop = 13 modul). */
const PATTERNS: readonly string[] = [
  "11011001100",
  "11001101100",
  "11001100110",
  "10010011000",
  "10010001100",
  "10001001100",
  "10011001000",
  "10011000100",
  "10001100100",
  "11001001000",
  "11001000100",
  "11000100100",
  "10110011100",
  "10011011100",
  "10011001110",
  "10111001100",
  "10011101100",
  "10011100110",
  "11001110010",
  "11001011100",
  "11001001110",
  "11011100100",
  "11001110100",
  "11101101110",
  "11101001100",
  "11100101100",
  "11100100110",
  "11101100100",
  "11100110100",
  "11100110010",
  "11011011000",
  "11011000110",
  "11000110110",
  "10100011000",
  "10001011000",
  "10001000110",
  "10110001000",
  "10001101000",
  "10001100010",
  "11010001000",
  "11000101000",
  "11000100010",
  "10110111000",
  "10110001110",
  "10001101110",
  "10111011000",
  "10111000110",
  "10001110110",
  "11101110110",
  "11010001110",
  "11000101110",
  "11011101000",
  "11011100010",
  "11011101110",
  "11101011000",
  "11101000110",
  "11100010110",
  "11101101000",
  "11101100010",
  "11100011010",
  "11101111010",
  "11001000010",
  "11110001010",
  "10100110000",
  "10100001100",
  "10010110000",
  "10010000110",
  "10000101100",
  "10000100110",
  "10110010000",
  "10110000100",
  "10011010000",
  "10011000010",
  "10000110100",
  "10000110010",
  "11000010010",
  "11001010000",
  "11110111010",
  "11000010100",
  "10001111010",
  "10100111100",
  "10010111100",
  "10010011110",
  "10111100100",
  "10011110100",
  "10011110010",
  "11110100100",
  "11110010100",
  "11110010010",
  "11011011110",
  "11011110110",
  "11110110110",
  "10101111000",
  "10100011110",
  "10001011110",
  "10111101000",
  "10111100010",
  "11110101000",
  "11110100010",
  "10111011110",
  "10111101110",
  "11101011110",
  "11110101110",
  "11010000100",
  "11010010000",
  "11010011100",
  "1100011101011",
];

export const CODE128_START_B = 104;
export const CODE128_STOP = 106;

/** Set karakter Code128-B: seluruh ASCII yang dapat dicetak. */
const CODE_B_MIN = 32;
const CODE_B_MAX = 126;

export type BarcodeRun = { x: number; width: number };

/**
 * Mengubah nilai menjadi rangkaian modul "1" (bar) dan "0" (space).
 *
 * @throws Jika nilai kosong atau memuat karakter di luar ASCII yang dapat dicetak.
 */
export function code128BModules(value: string): string {
  if (value.length === 0) {
    throw new Error("Nilai barcode tidak boleh kosong.");
  }

  const values: number[] = [CODE128_START_B];

  for (const char of value) {
    const code = char.charCodeAt(0);

    if (code < CODE_B_MIN || code > CODE_B_MAX) {
      throw new Error("Nilai barcode memuat karakter yang tidak didukung.");
    }

    values.push(code - CODE_B_MIN);
  }

  // Checksum: start + Σ (posisi * nilai), modulo 103. Posisi data mulai dari 1.
  let checksum = CODE128_START_B;

  for (let index = 1; index < values.length; index += 1) {
    checksum += values[index] * index;
  }

  values.push(checksum % 103);
  values.push(CODE128_STOP);

  return values.map((pattern) => PATTERNS[pattern]).join("");
}

/**
 * Rangkaian bar (bukan seluruh modul) untuk digambar pada SVG. Koordinat `x`
 * dan `width` dalam satuan modul.
 */
export function code128BBars(value: string): BarcodeRun[] {
  const modules = code128BModules(value);
  const runs: BarcodeRun[] = [];

  let index = 0;

  while (index < modules.length) {
    if (modules[index] === "1") {
      const start = index;

      while (index < modules.length && modules[index] === "1") {
        index += 1;
      }

      runs.push({ x: start, width: index - start });
    } else {
      index += 1;
    }
  }

  return runs;
}
