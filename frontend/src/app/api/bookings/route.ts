import { NextResponse } from "next/server";
import { forwardToLaravel, readJsonBody } from "@/lib/api/bff";
import type { BookingSummary, BookingTransaction } from "@/lib/booking/types";

export async function GET(request: Request) {
  return forwardToLaravel<{ data: BookingSummary[] }>(
    request,
    "/api/v1/bookings",
  );
}

export async function POST(request: Request) {
  const body = await readJsonBody(request);

  if (body === null) {
    return NextResponse.json(
      { message: "Format permintaan tidak valid." },
      { status: 400 },
    );
  }

  return forwardToLaravel<{ message: string; data: BookingTransaction }>(
    request,
    "/api/v1/bookings",
    { method: "POST", body },
  );
}
