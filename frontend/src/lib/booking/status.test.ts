import { describe, expect, it } from "vitest";
import {
  canPrintTickets,
  canShowRedemptionCode,
  canSimulatePayment,
} from "./status";

describe("canSimulatePayment", () => {
  it("hanya mengizinkan transaksi yang masih menunggu pembayaran", () => {
    expect(canSimulatePayment("pending")).toBe(true);
  });

  it("menolak transaksi yang sudah lunas atau batal", () => {
    expect(canSimulatePayment("paid")).toBe(false);
    expect(canSimulatePayment("checked_in")).toBe(false);
    expect(canSimulatePayment("cancelled")).toBe(false);
  });
});

describe("canPrintTickets", () => {
  it("mengizinkan cetak hanya setelah lunas", () => {
    expect(canPrintTickets("paid")).toBe(true);
    expect(canPrintTickets("checked_in")).toBe(true);
  });

  it("menolak cetak sebelum lunas", () => {
    expect(canPrintTickets("pending")).toBe(false);
    expect(canPrintTickets("cancelled")).toBe(false);
  });
});

describe("canShowRedemptionCode", () => {
  it("menampilkan kode penukaran setelah pembayaran sukses", () => {
    expect(canShowRedemptionCode("RDM-ABCDEFGHIJKLMNOPQRSTUVWXYZ")).toBe(true);
  });

  it("tidak pernah menampilkan QR/barcode penukaran sebelum pembayaran sukses", () => {
    expect(canShowRedemptionCode(null)).toBe(false);
    expect(canShowRedemptionCode("")).toBe(false);
  });
});
