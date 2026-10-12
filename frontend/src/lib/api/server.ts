import { API_BASE_URL } from "./config";
import { extractErrors, extractMessage, kindForStatus } from "./errors";
import type { ApiResult } from "./types";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
};

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text === "") return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Client terpusat untuk memanggil REST API Laravel dari sisi server.
 *
 * - Menyisipkan header Bearer bila token diberikan.
 * - Memetakan 401, 403, 422, 5xx, dan kegagalan jaringan menjadi ApiResult
 *   yang konsisten, sehingga pemanggil tidak perlu menebak bentuk error.
 * - Tidak pernah mencatat token; log dibiarkan bersih dari data sensitif.
 */
export async function laravelFetch<T>(
  path: string,
  { method = "GET", body, token }: RequestOptions = {},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { Accept: "application/json" };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      status: 0,
      kind: "network",
      message: extractMessage(null, 0),
    };
  }

  const payload = await parseJson(response);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      kind: kindForStatus(response.status),
      message: extractMessage(payload, response.status),
      errors: extractErrors(payload),
    };
  }

  return { ok: true, status: response.status, data: payload as T };
}
