import { NextResponse } from "next/server";
import { forwardToLaravel, readJsonBody } from "@/lib/api/bff";
import type { CounterTransaction } from "@/lib/counter/types";

export async function POST(request: Request) {
  const body = await readJsonBody(request);

  if (body === null) {
    return NextResponse.json(
      { message: "Format permintaan tidak valid." },
      { status: 400 },
    );
  }

  return forwardToLaravel<{ message: string; data: CounterTransaction }>(
    request,
    "/api/v1/counter/transactions",
    { method: "POST", body },
  );
}
