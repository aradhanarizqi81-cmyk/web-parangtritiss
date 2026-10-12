import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guard";

/**
 * Mengembalikan profil pengguna dari cookie sesi. Dipakai client component
 * bila perlu menyegarkan data tanpa memuat ulang halaman.
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { message: "Sesi Anda tidak valid. Silakan masuk kembali." },
      { status: 401 },
    );
  }

  return NextResponse.json({ data: user });
}
