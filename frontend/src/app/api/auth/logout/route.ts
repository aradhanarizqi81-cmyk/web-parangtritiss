import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/api/origin";
import { laravelFetch } from "@/lib/api/server";
import { clearSessionToken, getSessionToken } from "@/lib/auth/session";

/**
 * BFF logout. Mencabut token di Laravel (sesuai perilaku backend: hanya token
 * yang dipakai request tersebut) lalu menghapus cookie sesi.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: "Permintaan ditolak." }, { status: 403 });
  }

  const token = await getSessionToken();

  if (token) {
    await laravelFetch("/api/v1/auth/logout", { method: "POST", token });
  }

  await clearSessionToken();

  return NextResponse.json({ message: "Logout berhasil." });
}
