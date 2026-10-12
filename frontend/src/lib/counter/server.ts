import { laravelFetch } from "@/lib/api/server";
import type { ApiResult } from "@/lib/api/types";
import { getSessionToken } from "@/lib/auth/session";
import type { TariffCatalog } from "@/lib/pricing/tariffs";
import type { CounterTransaction } from "./types";

/**
 * Pembacaan data loket dari server component. Token diambil dari cookie
 * HttpOnly, jadi halaman tidak perlu memanggil BFF route handler sendiri.
 */
export async function fetchCounterTariffs(): Promise<
  ApiResult<{ data: TariffCatalog }>
> {
  const token = await getSessionToken();

  if (!token) {
    return {
      ok: false,
      status: 401,
      kind: "unauthorized",
      message: "Sesi Anda tidak valid. Silakan masuk kembali.",
    };
  }

  return laravelFetch<{ data: TariffCatalog }>("/api/v1/counter/tariffs", {
    token,
  });
}

export async function fetchCounterTransaction(
  id: string,
): Promise<ApiResult<{ data: CounterTransaction }>> {
  const token = await getSessionToken();

  if (!token) {
    return {
      ok: false,
      status: 401,
      kind: "unauthorized",
      message: "Sesi Anda tidak valid. Silakan masuk kembali.",
    };
  }

  return laravelFetch<{ data: CounterTransaction }>(
    `/api/v1/counter/transactions/${encodeURIComponent(id)}`,
    { token },
  );
}
