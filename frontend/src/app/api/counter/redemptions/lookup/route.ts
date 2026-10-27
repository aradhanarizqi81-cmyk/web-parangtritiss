import { NextResponse } from "next/server";
import { forwardToLaravel, readJsonBody } from "@/lib/api/bff";
import type { RedemptionTransaction } from "@/lib/counter/types";

/**
 * Pratinjau penukaran: hanya membaca, tidak mengubah status apa pun.
 * Kode penukaran tidak pernah masuk ke URL/`query`, jadi tidak tercatat di
 * riwayat browser maupun log akses.
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);

  if (body === null) {
    return NextResponse.json(
      { message: "Format permintaan tidak valid." },
      { status: 400 },
    );
  }

  return forwardToLaravel<{ data: RedemptionTransaction }>(
    request,
    "/api/v1/counter/redemptions/lookup",
    { method: "POST", body },
  );
}
