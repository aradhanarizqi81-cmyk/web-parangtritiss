import { describe, expect, it } from "vitest";
import { gateTone } from "./status";

describe("gateTone", () => {
  it("treats a created check-in as success", () => {
    expect(gateTone(201)).toBe("success");
  });

  it("treats an already-used ticket as used", () => {
    expect(gateTone(409)).toBe("used");
  });

  it("treats everything else as rejected", () => {
    expect(gateTone(401)).toBe("rejected");
    expect(gateTone(403)).toBe("rejected");
    expect(gateTone(404)).toBe("rejected");
    expect(gateTone(422)).toBe("rejected");
    expect(gateTone(429)).toBe("rejected");
    expect(gateTone(0)).toBe("rejected");
  });
});
