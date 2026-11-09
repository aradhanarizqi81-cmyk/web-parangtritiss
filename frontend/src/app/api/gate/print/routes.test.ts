import { beforeEach, describe, expect, it, vi } from "vitest";

const forwardToLaravel = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/bff", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/bff")>();
  return { ...actual, forwardToLaravel };
});

import { POST as lookup } from "./lookup/route";
import { POST as print } from "./route";

/**
 * Gate printing goes through the Next BFF, never straight to Laravel from the
 * browser. Lookup and print must stay on separate Laravel endpoints: mixing
 * them up would either consume the token on a mere preview or leave a correct
 * RDM- code unanswered with a 404.
 */
function request(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("gate print BFF routes", () => {
  beforeEach(() => {
    forwardToLaravel.mockReset();
    forwardToLaravel.mockImplementation(async () => Response.json({ data: {} }));
  });

  it.each([
    [
      "lookup",
      lookup,
      "/api/gate/print/lookup",
      "/api/v1/gate/print/lookup",
    ],
    ["print", print, "/api/gate/print", "/api/v1/gate/print"],
  ])("maps %s to its own Laravel endpoint", async (_name, handler, browserPath, laravelPath) => {
    const body = { code: "RDM-ABCDEFGHIJKLMNOPQRSTUVWX" };
    const incoming = request(browserPath, body);

    await handler(incoming);

    expect(forwardToLaravel).toHaveBeenCalledTimes(1);
    expect(forwardToLaravel).toHaveBeenCalledWith(incoming, laravelPath, {
      method: "POST",
      body,
    });
  });

  it("rejects a non-object body before calling Laravel", async () => {
    const response = await print(
      new Request("http://localhost/api/gate/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(["RDM-ABCDEFGHIJKLMNOPQRSTUVWX"]),
      }),
    );

    expect(response.status).toBe(400);
    expect(forwardToLaravel).not.toHaveBeenCalled();
  });
});
