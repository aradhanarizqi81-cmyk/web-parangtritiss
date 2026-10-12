import { forwardToLaravel } from "@/lib/api/bff";
import type { BookingTransaction } from "@/lib/booking/types";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;

  return forwardToLaravel<{ message: string; data: BookingTransaction }>(
    request,
    `/api/v1/bookings/${encodeURIComponent(id)}/print`,
    { method: "POST", body: {} },
  );
}
