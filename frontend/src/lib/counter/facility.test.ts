import { describe, expect, it } from "vitest";
import {
  claimableEntitlements,
  facilityClaimLabel,
  facilityTone,
} from "./facility";
import type { FacilityEntitlement } from "./types";

function entitlement(
  overrides: Partial<FacilityEntitlement> = {},
): FacilityEntitlement {
  return {
    entitlement_id: 1,
    code: "FREE_TEA",
    name: "Minuman Gratis",
    status: "granted",
    status_label: "Tersedia",
    granted_at: "2026-10-26T01:00:00+07:00",
    redeemed_at: null,
    redeemed_by: null,
    voided_at: null,
    can_claim: true,
    block_reason: null,
    ...overrides,
  };
}

describe("facilityTone", () => {
  it("tersedia ketika backend mengizinkan klaim", () => {
    expect(facilityTone(entitlement())).toBe("claimable");
  });

  it("tertahan ketika backend memberi alasan", () => {
    expect(
      facilityTone(
        entitlement({
          can_claim: false,
          block_reason: "Tiket belum check-in di gerbang.",
        }),
      ),
    ).toBe("blocked");
  });

  it("sudah diklaim selalu diutamakan, termasuk setelah pembatalan", () => {
    expect(
      facilityTone(
        entitlement({
          status: "redeemed",
          status_label: "Sudah Diklaim",
          redeemed_at: "2026-10-26T02:00:00+07:00",
          can_claim: false,
          block_reason: "Hak fasilitas ini sudah diklaim.",
        }),
      ),
    ).toBe("redeemed");
  });

  it("hak yang dibatalkan tidak pernah tampil dapat diklaim", () => {
    expect(
      facilityTone(
        entitlement({
          status: "void",
          status_label: "Dibatalkan",
          voided_at: "2026-10-26T03:00:00+07:00",
          can_claim: false,
          block_reason: "Transaksi ini sudah dibatalkan.",
        }),
      ),
    ).toBe("blocked");
  });
});

describe("facilityClaimLabel", () => {
  it("memakai nama fasilitas", () => {
    expect(facilityClaimLabel("Minuman Gratis")).toBe("Klaim Minuman Gratis");
  });

  it("punya label cadangan bila nama tidak tersedia", () => {
    expect(facilityClaimLabel(null)).toBe("Klaim Fasilitas");
  });
});

describe("claimableEntitlements", () => {
  it("hanya mengembalikan hak yang dapat diklaim", () => {
    const claimable = entitlement({ entitlement_id: 1 });
    const redeemed = entitlement({
      entitlement_id: 2,
      status: "redeemed",
      redeemed_at: "2026-10-26T02:00:00+07:00",
      can_claim: false,
    });
    const blocked = entitlement({
      entitlement_id: 3,
      can_claim: false,
      block_reason: "Fasilitas ini sedang tidak aktif.",
    });

    expect(claimableEntitlements([claimable, redeemed, blocked])).toEqual([
      claimable,
    ]);
  });
});
