import { NextResponse } from "next/server";
import { forwardToLaravel, readJsonBody } from "@/lib/api/bff";
import type { RedemptionTransaction } from "@/lib/counter/types";

/**
 * Gate print lookup: meneruskan kode penukaran online (`RDM-`) ke Laravel
 * untuk pratinjau read-only. Tidak ada token yang dibuat atau dikonsumsi di
 * sini, dan kode tidak pernah masuk ke URL/`query`.
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
    "/api/v1/gate/print/lookup",
    { method: "POST", body },
  );
}
