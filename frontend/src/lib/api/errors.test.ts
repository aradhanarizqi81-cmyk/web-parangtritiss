import { describe, expect, it } from "vitest";
import {
  ApiError,
  extractErrors,
  extractMessage,
  kindForStatus,
} from "./errors";

describe("kindForStatus", () => {
  it("memetakan status HTTP yang dikenal", () => {
    expect(kindForStatus(422)).toBe("validation");
    expect(kindForStatus(401)).toBe("unauthorized");
    expect(kindForStatus(403)).toBe("forbidden");
    expect(kindForStatus(404)).toBe("not_found");
    expect(kindForStatus(500)).toBe("server");
    expect(kindForStatus(0)).toBe("network");
    expect(kindForStatus(418)).toBe("unknown");
  });
});

describe("extractMessage", () => {
  it("memakai pesan dari backend bila ada", () => {
    expect(extractMessage({ message: "Login gagal." }, 422)).toBe(
      "Login gagal.",
    );
  });

  it("memakai pesan cadangan per status bila pesan kosong", () => {
    expect(extractMessage(null, 401)).toContain("Sesi");
    expect(extractMessage({}, 403)).toContain("hak akses");
    expect(extractMessage(null, 0)).toContain("Tidak dapat menghubungi");
    expect(extractMessage({ message: "   " }, 500)).toContain("server");
  });
});

describe("extractErrors", () => {
  it("mengembalikan objek errors validasi", () => {
    const errors = { email: ["Email sudah dipakai."] };
    expect(extractErrors({ errors })).toEqual(errors);
  });

  it("mengembalikan undefined bila tidak ada", () => {
    expect(extractErrors({ message: "x" })).toBeUndefined();
    expect(extractErrors(null)).toBeUndefined();
  });
});

describe("ApiError", () => {
  it("membawa status, kind, dan errors", () => {
    const error = new ApiError({
      status: 422,
      kind: "validation",
      message: "m",
      errors: { email: ["x"] },
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(422);
    expect(error.kind).toBe("validation");
    expect(error.errors?.email?.[0]).toBe("x");
  });
});
