import { laravelFetch } from "@/lib/api/server";
import type { ApiResult } from "@/lib/api/types";
import { getSessionToken } from "@/lib/auth/session";
import type { TariffCatalog } from "@/lib/pricing/tariffs";
import type { BookingSummary, BookingTransaction } from "./types";

const NO_SESSION: ApiResult<never> = {
  ok: false,
  status: 401,
  kind: "unauthorized",
  message: "Sesi Anda tidak valid. Silakan masuk kembali.",
};

/**
 * Pembacaan data booking dari server component. Token diambil dari cookie
 * HttpOnly, jadi halaman tidak perlu memanggil BFF route handler sendiri.
 */
export async function fetchBookingTariffs(): Promise<
  ApiResult<{ data: TariffCatalog }>
> {
  const token = await getSessionToken();

  if (!token) return NO_SESSION;

  return laravelFetch<{ data: TariffCatalog }>("/api/v1/booking/tariffs", {
    token,
  });
}

export async function fetchBookings(): Promise<
  ApiResult<{ data: BookingSummary[] }>
> {
  const token = await getSessionToken();

  if (!token) return NO_SESSION;

  return laravelFetch<{ data: BookingSummary[] }>("/api/v1/bookings", {
    token,
  });
}

export async function fetchBooking(
  id: string,
): Promise<ApiResult<{ data: BookingTransaction }>> {
  const token = await getSessionToken();

  if (!token) return NO_SESSION;

  return laravelFetch<{ data: BookingTransaction }>(
    `/api/v1/bookings/${encodeURIComponent(id)}`,
    { token },
  );
}
