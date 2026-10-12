import { ApiError, extractErrors, extractMessage, kindForStatus } from "./errors";

/**
 * Helper request untuk client component. Semua panggilan menuju route handler
 * Next.js (same-origin), bukan langsung ke Laravel, sehingga token yang
 * tersimpan di cookie HttpOnly tidak pernah dibaca JavaScript.
 */
export async function apiRequest<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers:
        body === undefined
          ? { Accept: "application/json" }
          : { Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError({
      status: 0,
      kind: "network",
      message: extractMessage(null, 0),
    });
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text !== "") {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      kind: kindForStatus(response.status),
      message: extractMessage(payload, response.status),
      errors: extractErrors(payload),
    });
  }

  return payload as T;
}
