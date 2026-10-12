import type { CounterTariffs } from "./types";

export type VehicleEstimateLine = {
  vehicleTypeId: number;
  quantity: number;
  unitTariff: number;
  subtotal: number;
};

export type CostEstimate = {
  visitorCount: number;
  visitorUnitTariff: number;
  visitorTotal: number;
  vehicleLines: VehicleEstimateLine[];
  vehicleTotal: number;
  total: number;
};

/**
 * Hitung estimasi biaya dari tarif aktif. Ini HANYA untuk tampilan di browser;
 * backend selalu menghitung ulang total dari tarif database saat transaksi
 * disimpan, sehingga angka di sini tidak pernah dipercaya sebagai nilai final.
 */
export function estimateCost(
  tariffs: CounterTariffs | null,
  visitorCount: number,
  quantities: Record<number, number>,
): CostEstimate {
  const visitorUnitTariff = tariffs?.visitor_tariff?.unit_tariff ?? 0;
  const safeVisitorCount = Math.max(0, Math.trunc(visitorCount));
  const visitorTotal = safeVisitorCount * visitorUnitTariff;

  const vehicleLines = (tariffs?.vehicle_types ?? [])
    .map((type): VehicleEstimateLine => {
      const quantity = Math.max(0, Math.trunc(quantities[type.id] ?? 0));

      return {
        vehicleTypeId: type.id,
        quantity,
        unitTariff: type.unit_tariff,
        subtotal: quantity * type.unit_tariff,
      };
    })
    .filter((line) => line.quantity > 0);

  const vehicleTotal = vehicleLines.reduce(
    (sum, line) => sum + line.subtotal,
    0,
  );

  return {
    visitorCount: safeVisitorCount,
    visitorUnitTariff,
    visitorTotal,
    vehicleLines,
    vehicleTotal,
    total: visitorTotal + vehicleTotal,
  };
}

/**
 * Format rupiah tanpa desimal (nilai uang backend berupa integer rupiah).
 */
export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
