import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api/config";
import { extractMessage } from "@/lib/api/errors";
import { getSessionToken } from "@/lib/auth/session";

/**
 * Meneruskan unduhan berkas (CSV) dari Laravel ke browser memakai token sesi
 * HttpOnly. Token tidak pernah sampai ke browser; hanya isi berkas dan header
 * unduhan yang diteruskan. Filter pada query string diteruskan apa adanya dan
 * tetap divalidasi ulang oleh backend.
 */
export async function forwardDownload(
  request: Request,
  path: string,
): Promise<Response> {
  const token = await getSessionToken();

  if (!token) {
    return NextResponse.json(
      { message: "Sesi Anda tidak valid. Silakan masuk kembali." },
      { status: 401 },
    );
  }

  const search = new URL(request.url).search;

  let upstream: Response;

  try {
    upstream = await fetch(`${API_BASE_URL}${path}${search}`, {
      headers: { Accept: "text/csv", Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { message: "Tidak dapat menghubungi server. Periksa koneksi Anda." },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    const payload = await upstream.json().catch(() => null);

    return NextResponse.json(
      { message: extractMessage(payload, upstream.status) },
      { status: upstream.status || 502 },
    );
  }

  const body = await upstream.arrayBuffer();
  const headers = new Headers();

  headers.set(
    "Content-Type",
    upstream.headers.get("Content-Type") ?? "text/csv; charset=UTF-8",
  );
  headers.set(
    "Content-Disposition",
    upstream.headers.get("Content-Disposition") ?? 'attachment; filename="laporan.csv"',
  );
  headers.set("Cache-Control", "no-store");

  return new Response(body, { status: 200, headers });
}
