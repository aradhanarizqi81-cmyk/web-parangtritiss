import { NextResponse } from "next/server";
import { forwardToLaravel, readJsonBody } from "@/lib/api/bff";
import type { FacilityTicket } from "@/lib/counter/types";

/**
 * Klaim satu fasilitas untuk satu tiket individual. Hanya aksi ini yang
 * menulis. Backend menolak tiket yang belum lunas, belum check-in, bukan
 * tanggal kunjungan, atau hak yang sudah diklaim (422/409) dengan penguncian
 * baris agar dua permintaan bersamaan tidak menghasilkan klaim ganda.
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);

  if (body === null) {
    return NextResponse.json(
      { message: "Format permintaan tidak valid." },
      { status: 400 },
    );
  }

  return forwardToLaravel<{ message: string; data: FacilityTicket }>(
    request,
    "/api/v1/counter/facilities/claim",
    { method: "POST", body },
  );
}
