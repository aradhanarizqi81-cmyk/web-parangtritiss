import { cn } from "./cn";

/*
 * Satu kelas input untuk semua form. Sebelumnya ada enam definisi inputClass
 * yang berbeda padding, radius, dan warna fokusnya, sehingga form loket dan
 * form booking terlihat seperti dua aplikasi.
 *
 * min-h-11 (44px) menjaga target sentuh tetap nyaman di ponsel tanpa membuat
 * input terasa besar di layar kerja. Ukuran teks 16px di layar sentuh mencegah
 * Safari iOS memperbesar halaman saat kolom difokuskan; mulai `sm` turun ke
 * 14px agar formulir loket tetap ringkas di desktop.
 */
export const inputClasses =
  "w-full min-h-11 min-w-0 rounded-md border border-line bg-surface px-3.5 py-2.5 text-base text-foreground transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm";

export function inputClass(className?: string): string {
  return cn(inputClasses, className);
}
