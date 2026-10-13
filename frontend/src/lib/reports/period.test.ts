import { describe, expect, it } from "vitest";
import {
  defaultPeriod,
  readDateFilters,
  readReportFilters,
  toQueryString,
  venueToday,
  withResolvedPeriod,
} from "./period";

describe("venueToday", () => {
  it("memakai tanggal kalender zona venue, bukan UTC", () => {
    // 17:30 UTC = 00:30 keesokan harinya di Asia/Jakarta (UTC+7).
    expect(venueToday(new Date("2026-10-14T17:30:00Z"))).toBe("2026-10-15");
    expect(venueToday(new Date("2026-10-14T16:59:00Z"))).toBe("2026-10-14");
  });
});

describe("defaultPeriod", () => {
  it("mulai awal bulan berjalan sampai hari ini", () => {
    const today = venueToday();
    const period = defaultPeriod();

    expect(period).toEqual({ from: `${today.slice(0, 7)}-01`, to: today });
  });
});

describe("withResolvedPeriod", () => {
  it("mengisi tanggal yang kosong dengan default", () => {
    const period = defaultPeriod();

    expect(withResolvedPeriod({})).toEqual({
      date_from: period.from,
      date_to: period.to,
    });
    expect(withResolvedPeriod({ date_from: "2026-01-01" })).toEqual({
      date_from: "2026-01-01",
      date_to: period.to,
    });
  });

  it("tidak menimpa tanggal yang sudah diisi", () => {
    expect(
      withResolvedPeriod({ date_from: "2026-02-01", date_to: "2026-02-28" }),
    ).toMatchObject({ date_from: "2026-02-01", date_to: "2026-02-28" });
  });
});

describe("readReportFilters", () => {
  it("mengambil nilai pertama dan mengabaikan kunci tak dikenal", () => {
    expect(
      readReportFilters({
        date_from: ["2026-01-01", "2026-01-02"],
        source: "online",
        mysterious: "x",
      }),
    ).toEqual({ date_from: "2026-01-01", source: "online" });
  });

  it("membuang nilai kosong", () => {
    expect(readReportFilters({ source: "  ", status: "paid" })).toEqual({
      status: "paid",
    });
  });

  it("dashboard hanya membaca rentang tanggal", () => {
    expect(readDateFilters({ source: "online", date_to: "2026-01-31" })).toEqual(
      { date_to: "2026-01-31" },
    );
  });
});

describe("toQueryString", () => {
  it("menyusun query string dan membuang nilai kosong", () => {
    expect(
      toQueryString({
        date_from: "2026-01-01",
        date_to: "",
        page: undefined,
        source: "counter",
      }),
    ).toBe("date_from=2026-01-01&source=counter");
  });

  it("mengembalikan string kosong bila tidak ada filter", () => {
    expect(toQueryString({})).toBe("");
  });
});
