import { describe, expect, it } from "vitest";
import { estimateCost, formatRupiah } from "./estimate";
import type { CounterTariffs } from "./types";

const tariffs: CounterTariffs = {
  visitor_tariff: { code: "visitor", name: "Wisatawan", unit_tariff: 15000 },
  vehicle_types: [
    { id: 1, code: "motorcycle", name: "Motor", unit_tariff: 2000 },
    { id: 2, code: "car", name: "Mobil", unit_tariff: 5000 },
    { id: 3, code: "bus_truck", name: "Bus / Truk", unit_tariff: 10000 },
  ],
};

describe("estimateCost", () => {
  it("menghitung total sesuai contoh pada spesifikasi", () => {
    // 5 pengunjung + 2 motor + 1 mobil = 75.000 + 4.000 + 5.000 = 84.000
    const estimate = estimateCost(tariffs, 5, { 1: 2, 2: 1 });

    expect(estimate.visitorUnitTariff).toBe(15000);
    expect(estimate.visitorTotal).toBe(75000);
    expect(estimate.vehicleTotal).toBe(9000);
    expect(estimate.total).toBe(84000);
    expect(estimate.vehicleLines).toHaveLength(2);
  });

  it("mengabaikan jenis kendaraan dengan jumlah nol", () => {
    const estimate = estimateCost(tariffs, 1, { 1: 0, 2: 0 });

    expect(estimate.vehicleLines).toHaveLength(0);
    expect(estimate.total).toBe(15000);
  });

  it("menahan nilai negatif dan pecahan agar tidak merusak total", () => {
    const estimate = estimateCost(tariffs, -3, { 1: -2.9, 2: 1.9 });

    expect(estimate.visitorCount).toBe(0);
    expect(estimate.visitorTotal).toBe(0);
    expect(estimate.vehicleLines).toEqual([
      { vehicleTypeId: 2, quantity: 1, unitTariff: 5000, subtotal: 5000 },
    ]);
    expect(estimate.total).toBe(5000);
  });

  it("mengembalikan nol saat tarif belum tersedia", () => {
    const estimate = estimateCost(null, 4, { 1: 3 });

    expect(estimate.total).toBe(0);
    expect(estimate.vehicleLines).toHaveLength(0);
  });
});

describe("formatRupiah", () => {
  it("memformat integer rupiah tanpa desimal", () => {
    expect(formatRupiah(84000)).toContain("84.000");
    expect(formatRupiah(84000)).not.toContain(",00");
  });
});
