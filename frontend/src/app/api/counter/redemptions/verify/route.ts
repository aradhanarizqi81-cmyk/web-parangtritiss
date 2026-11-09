import { NextResponse } from "next/server";
import { forwardToLaravel, readJsonBody } from "@/lib/api/bff";
import type { RedemptionTransaction } from "@/lib/counter/types";

/**
 * Verifikasi Loket 2: hanya membaca dan memvalidasi booking online. Tidak
 * mengonsumsi token, tidak menandai `redeemed_at`, dan tidak mencetak tiket.
 * Pencetakan fisik dilakukan di gate melalui `/api/gate/print`.
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);

  if (body === null) {
    return NextResponse.json(
      { message: "Format permintaan tidak valid." },
      { status: 400 },
    );
  }

  return forwardToLaravel<{ message: string; data: RedemptionTransaction }>(
    request,
    "/api/v1/counter/redemptions/verify",
    { method: "POST", body },
  );
}
