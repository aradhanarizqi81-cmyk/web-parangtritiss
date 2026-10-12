import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { ApiError } from "./errors";

function fetchReturning(status: number, body: string) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  } as unknown as Response);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiRequest", () => {
  it("mengembalikan data terurai saat sukses", async () => {
    fetchReturning(200, JSON.stringify({ data: { id: 1 } }));

    await expect(apiRequest("/api/auth/me")).resolves.toEqual({
      data: { id: 1 },
    });
  });

  it("melempar ApiError berisi errors validasi saat 422", async () => {
    fetchReturning(
      422,
      JSON.stringify({ message: "invalid", errors: { email: ["dup"] } }),
    );

    await expect(apiRequest("/api/auth/login", {})).rejects.toMatchObject({
      status: 422,
      kind: "validation",
      errors: { email: ["dup"] },
    });
  });

  it("melempar ApiError unauthorized saat 401", async () => {
    fetchReturning(401, JSON.stringify({ message: "unauth" }));

    const error = await apiRequest("/api/auth/me").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 401, kind: "unauthorized" });
  });

  it("melempar ApiError forbidden saat 403", async () => {
    fetchReturning(403, JSON.stringify({ message: "forbidden" }));

    await expect(apiRequest("/api/auth/me")).rejects.toMatchObject({
      status: 403,
      kind: "forbidden",
    });
  });

  it("melempar error jaringan saat fetch gagal", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("gagal"));

    await expect(apiRequest("/api/auth/me")).rejects.toMatchObject({
      status: 0,
      kind: "network",
    });
  });
});
