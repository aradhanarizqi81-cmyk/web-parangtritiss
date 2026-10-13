import { NextResponse } from "next/server";
import { forwardToLaravel, readJsonBody } from "@/lib/api/bff";
import type { GateCheckinResponse } from "@/lib/gate/types";

export async function POST(request: Request) {
  const body = await readJsonBody(request);

  if (body === null) {
    return NextResponse.json(
      { message: "Format permintaan tidak valid." },
      { status: 400 },
    );
  }

  return forwardToLaravel<GateCheckinResponse>(
    request,
    "/api/v1/gate/check-in",
    { method: "POST", body },
  );
}
