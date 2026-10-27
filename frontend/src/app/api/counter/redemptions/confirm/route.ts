import { NextResponse } from "next/server";
import { forwardToLaravel, readJsonBody } from "@/lib/api/bff";
import type { RedemptionTransaction } from "@/lib/counter/types";

/**
 * Konfirmasi penukaran: satu-satunya aksi yang menandai booking sebagai sudah
 * ditukarkan. Ditolak backend bila belum lunas (422) atau sudah ditukarkan
 * (409), dengan penguncian baris agar dua permintaan bersamaan tidak menghasilkan
 * penukaran ganda.
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
    "/api/v1/counter/redemptions/confirm",
    { method: "POST", body },
  );
}
