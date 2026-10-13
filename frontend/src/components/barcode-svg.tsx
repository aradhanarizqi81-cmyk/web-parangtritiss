import { code128BBars } from "@/lib/barcode/code128";

/**
 * Merender barcode Code128-B sebagai SVG inline untuk tiket cetak.
 *
 * Hanya menggambar; tidak menyimpan atau mengirim nilai ke mana pun. Nilainya
 * adalah `barcode_token` transaksi (opaque, tanpa data pribadi) yang dipindai di
 * gerbang.
 */
export default function BarcodeSvg({
  value,
  moduleWidth = 2,
  height = 56,
  className,
}: {
  value: string;
  moduleWidth?: number;
  height?: number;
  className?: string;
}) {
  let bars: { x: number; width: number }[];
  const quietZoneModules = 10;

  try {
    bars = code128BBars(value);
  } catch {
    // Nilai tak terduga (mis. token kosong) tidak boleh membuat halaman cetak
    // gagal: tampilkan token sebagai teks saja.
    return (
      <p className={`break-all font-mono text-xs ${className ?? ""}`}>{value}</p>
    );
  }

  const dataWidth = bars.reduce(
    (max, bar) => Math.max(max, bar.x + bar.width),
    0,
  );
  const totalModules = dataWidth + quietZoneModules * 2;
  const width = totalModules * moduleWidth;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`Barcode ${value}`}
      className={className}
    >
      <rect width={width} height={height} fill="#ffffff" />
      {bars.map((bar) => (
        <rect
          key={bar.x}
          x={(bar.x + quietZoneModules) * moduleWidth}
          y={0}
          width={bar.width * moduleWidth}
          height={height}
          fill="#000000"
        />
      ))}
    </svg>
  );
}
