/**
 * Tarif dan estimasi biaya bersama untuk alur loket maupun booking online.
 *
 * Nilai `unit_tariff` di sini berasal dari backend dan hanya dipakai untuk
 * estimasi tampilan. Backend selalu menghitung ulang total saat transaksi
 * disimpan, sehingga angka di modul ini tidak pernah menjadi sumber kebenaran.
 */

export type VisitorTariff = {
  code: string;
  name: string;
  unit_tariff: number;
};

export type VehicleTypeTariff = {
  id: number;
  code: string;
  name: string;
  unit_tariff: number;
};

export type TariffCatalog = {
  visitor_tariff: VisitorTariff | null;
  vehicle_types: VehicleTypeTariff[];
};

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
  tariffs: TariffCatalog | null,
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
