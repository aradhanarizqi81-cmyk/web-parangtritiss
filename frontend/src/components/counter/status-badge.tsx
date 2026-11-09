import Badge, { type BadgeTone } from "@/components/ui/badge";

/*
 * Status transaksi, tiket, pembayaran, dan penukaran memakai satu peta warna
 * semantik. Sebelumnya setiap status memakai nama warna Tailwind sendiri
 * (amber/emerald/sky/red), sehingga warna yang sama bisa berarti berbeda di
 * halaman berbeda dan tidak ikut berubah saat token tema disesuaikan.
 */
const TONES: Record<string, BadgeTone> = {
  pending: "warning",
  granted: "warning",
  paid: "success",
  used: "success",
  redeemed: "success",
  success: "success",
  checked_in: "info",
  printed: "info",
  cancelled: "danger",
  void: "danger",
  failed: "danger",
  issued: "neutral",
};

/**
 * Lencana status untuk transaksi, tiket, dan pembayaran.
 *
 * Peta status ke tone tetap berada di sini karena domain yang tahu arti status,
 * sedangkan bentuk dan warna lencana dimiliki `ui/badge`. Halaman cukup
 * memanggil komponen ini dan tidak perlu mengimpor nama warna.
 */
export default function StatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  return <Badge tone={TONES[status] ?? "neutral"}>{label}</Badge>;
}
