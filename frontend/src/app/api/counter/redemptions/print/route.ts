import { NextResponse } from "next/server";
import { forwardToLaravel, readJsonBody } from "@/lib/api/bff";
import type { RedemptionTransaction } from "@/lib/counter/types";

/**
 * Pencatatan cetak gelang. Idempoten: cetak ulang tidak membuat tiket baru,
 * tidak menggandakan penukaran, dan tidak membuat check-in — hanya status cetak
 * (pertama disimpan) dan audit yang diperbarui.
 *
 * Pencatatan dilakukan saat tombol cetak ditekan, bukan saat halaman dibuka.
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
    "/api/v1/counter/redemptions/print",
    { method: "POST", body },
  );
}
