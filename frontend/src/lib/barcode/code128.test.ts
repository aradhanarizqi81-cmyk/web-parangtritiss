import { describe, expect, it } from "vitest";
import { code128BBars, code128BModules } from "./code128";

describe("code128BModules", () => {
  it("encodes the start, data, checksum and stop symbols", () => {
    // "AB" -> start B (104), 'A' (33), 'B' (34), checksum 102, stop (106).
    // Length = 11 * (1 start + 2 data + 1 checksum) + 13 stop = 57.
    const modules = code128BModules("AB");

    expect(modules).toHaveLength(57);
    expect(modules.startsWith("11010010000")).toBe(true); // start B
    expect(modules.endsWith("1100011101011")).toBe(true); // stop

    // Data symbols: 'A' = value 33, 'B' = value 34.
    expect(modules.slice(11, 22)).toBe("10100011000");
    expect(modules.slice(22, 33)).toBe("10001011000");
    // Checksum (104 + 33*1 + 34*2) % 103 = 102.
    expect(modules.slice(33, 44)).toBe("11110101110");
  });

  it("only contains bar and space modules", () => {
    expect(code128BModules("TRX-20261013-AB12CD")).toMatch(/^[01]+$/);
  });

  it("rejects an empty value", () => {
    expect(() => code128BModules("")).toThrow();
  });

  it("rejects characters outside printable ASCII", () => {
    expect(() => code128BModules("AB\u0000")).toThrow();
  });
});

describe("code128BBars", () => {
  it("returns contiguous bar runs that cover every '1' module", () => {
    const value = "TRX-20261013-AB12CD";
    const modules = code128BModules(value);
    const bars = code128BBars(value);
    const covered = bars.reduce((total, bar) => total + bar.width, 0);

    expect(covered).toBe([...modules].filter((m) => m === "1").length);

    // Runs are strictly increasing and never overlap.
    bars.forEach((bar, index) => {
      expect(bar.width).toBeGreaterThan(0);
      if (index > 0) {
        const previous = bars[index - 1];
        expect(bar.x).toBeGreaterThanOrEqual(previous.x + previous.width);
      }
    });
  });
});
