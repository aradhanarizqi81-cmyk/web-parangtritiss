import { beforeEach, describe, expect, it, vi } from "vitest";

const forwardToLaravel = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/bff", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/bff")>();
  return { ...actual, forwardToLaravel };
});

import { POST as confirm } from "./confirm/route";
import { POST as lookup } from "./lookup/route";
import { POST as print } from "./print/route";

/**
 * The browser only ever talks to the Next BFF. Each redemption action must map
 * to its own Laravel endpoint and keep POST + the JSON body intact, otherwise a
 * correct QR code is answered with a 404 at the wrong URL.
 */
function request(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("counter redemption BFF routes", () => {
  beforeEach(() => {
    forwardToLaravel.mockReset();
    forwardToLaravel.mockImplementation(async () => Response.json({ data: {} }));
  });

  it.each([
    ["lookup", lookup, "/api/counter/redemptions/lookup", "/api/v1/counter/redemptions/lookup"],
    ["confirm", confirm, "/api/counter/redemptions/confirm", "/api/v1/counter/redemptions/confirm"],
    ["print", print, "/api/counter/redemptions/print", "/api/v1/counter/redemptions/print"],
  ])("maps %s to the Laravel redemption endpoint", async (_name, handler, browserPath, laravelPath) => {
    const body = { redemption_token: "RDM-ABCDEFGHIJKLMNOPQRSTUVWX" };
    const incoming = request(browserPath, body);

    await handler(incoming);

    expect(forwardToLaravel).toHaveBeenCalledTimes(1);
    expect(forwardToLaravel).toHaveBeenCalledWith(incoming, laravelPath, {
      method: "POST",
      body,
    });
  });

  it("rejects a non-object body before calling Laravel", async () => {
    const response = await lookup(
      new Request("http://localhost/api/counter/redemptions/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(["RDM-ABCDEFGHIJKLMNOPQRSTUVWX"]),
      }),
    );

    expect(response.status).toBe(400);
    expect(forwardToLaravel).not.toHaveBeenCalled();
  });
});
