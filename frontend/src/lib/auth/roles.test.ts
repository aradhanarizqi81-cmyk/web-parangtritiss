import { describe, expect, it } from "vitest";
import { staffDestination } from "./roles";

describe("staffDestination", () => {
  it("mengantar tiap peran pegawai ke areanya sendiri", () => {
    expect(staffDestination("admin")).toBe("/admin");
    expect(staffDestination("cashier")).toBe("/counter");
    expect(staffDestination("gate_staff")).toBe("/gate");
  });

  it("menolak wisatawan dari portal operasional", () => {
    expect(staffDestination("visitor")).toBeNull();
  });

  it("tidak pernah mengembalikan alamat absolut atau URL dari luar", () => {
    const destinations = (
      ["admin", "cashier", "gate_staff", "visitor"] as const
    ).map((role) => staffDestination(role));

    for (const destination of destinations) {
      if (destination === null) continue;

      expect(destination.startsWith("/")).toBe(true);
      expect(destination.startsWith("//")).toBe(false);
      expect(destination).not.toContain("://");
    }
  });
});
