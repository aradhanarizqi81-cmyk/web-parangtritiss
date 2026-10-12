import { NextResponse } from "next/server";
import { forwardToLaravel, readJsonBody } from "@/lib/api/bff";
import type { BookingTransaction } from "@/lib/booking/types";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  const body = await readJsonBody(request);

  if (body === null) {
    return NextResponse.json(
      { message: "Format permintaan tidak valid." },
      { status: 400 },
    );
  }

  return forwardToLaravel<{ message: string; data: BookingTransaction }>(
    request,
    `/api/v1/bookings/${encodeURIComponent(id)}/simulate-payment`,
    { method: "POST", body },
  );
}
