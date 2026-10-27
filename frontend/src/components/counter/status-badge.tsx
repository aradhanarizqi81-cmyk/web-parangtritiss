const STYLES: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-800",
  checked_in: "border-sky-200 bg-sky-50 text-sky-800",
  cancelled: "border-red-200 bg-red-50 text-red-700",
  issued: "border-neutral-200 bg-neutral-100 text-neutral-700",
  printed: "border-sky-200 bg-sky-50 text-sky-800",
  used: "border-emerald-200 bg-emerald-50 text-emerald-800",
  void: "border-red-200 bg-red-50 text-red-700",
  granted: "border-amber-200 bg-amber-50 text-amber-800",
  redeemed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  failed: "border-red-200 bg-red-50 text-red-700",
};

/**
 * Lencana status untuk transaksi, tiket, dan pembayaran.
 */
export default function StatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  const style =
    STYLES[status] ?? "border-neutral-200 bg-neutral-100 text-neutral-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}
