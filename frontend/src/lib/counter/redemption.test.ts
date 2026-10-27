import { describe, expect, it } from "vitest";
import {
  hasPrintedTickets,
  redemptionTone,
  wristbandButtonLabel,
} from "./redemption";
import type { RedemptionState } from "./types";

function state(overrides: Partial<RedemptionState> = {}): RedemptionState {
  return {
    redeemed: false,
    redeemed_at: null,
    redeemed_by: null,
    status: "pending",
    status_label: "Belum Ditukarkan",
    can_redeem: true,
    can_reprint: false,
    block_reason: null,
    ...overrides,
  };
}

describe("redemptionTone", () => {
  it("membuka konfirmasi untuk booking lunas yang belum ditukarkan", () => {
    expect(redemptionTone(state())).toBe("redeemable");
  });

  it("menampilkan penolakan ber alas untuk booking lunas yang belum ditukarkan", () => {
    const blocked = state({
      can_redeem: false,
      block_reason: "Pembayaran booking ini belum berhasil.",
    });

    expect(redemptionTone(blocked)).toBe("blocked");
  });

  it("status ditukarkan selalu diutamakan di atas penolakan", () => {
    const redeemed = state({
      redeemed: true,
      can_redeem: false,
      can_reprint: true,
    });

    expect(redemptionTone(redeemed)).toBe("redeemed");
  });
});

describe("hasPrintedTickets", () => {
  it("belum tercetak ketika tidak ada tiket yang punya printed_at", () => {
    expect(hasPrintedTickets([])).toBe(false);
    expect(hasPrintedTickets([{ printed_at: null }])).toBe(false);
  });

  it("sudah tercetak ketika minimal satu tiket punya printed_at", () => {
    expect(
      hasPrintedTickets([
        { printed_at: null },
        { printed_at: "2026-10-19T04:00:00+07:00" },
      ]),
    ).toBe(true);
  });
});

describe("wristbandButtonLabel", () => {
  it("label cetak pertama untuk penukaran baru", () => {
    expect(wristbandButtonLabel(false)).toBe("Cetak Gelang");
  });

  it("label cetak ulang setelah pencatatan cetak pertama", () => {
    expect(wristbandButtonLabel(true)).toBe("Cetak Ulang Gelang");
  });
});
