import { NextResponse } from "next/server";
import { forwardToLaravel, readJsonBody } from "@/lib/api/bff";
import type { RedemptionTransaction } from "@/lib/counter/types";

/**
 * Gate print: satu-satunya aksi yang mengonsumsi token penukaran dan mencatat
 * pencetakan tiket fisik. Backend menolak token yang sudah dipakai (409) dan
 * booking yang belum lunas (422) dengan penguncian baris.
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
    "/api/v1/gate/print",
    { method: "POST", body },
  );
}
