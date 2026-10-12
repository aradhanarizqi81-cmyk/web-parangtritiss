import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/api/origin";
import { laravelFetch } from "@/lib/api/server";
import type { User } from "@/lib/api/types";
import { setSessionToken } from "@/lib/auth/session";

type AuthPayload = { data: User; token: string; token_type: string };

/**
 * BFF login. Kredensial diteruskan ke Laravel; token yang dikembalikan
 * disimpan pada cookie HttpOnly, tidak pernah diekspos ke browser.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: "Permintaan ditolak." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);

  if (body === null || typeof body !== "object") {
    return NextResponse.json(
      { message: "Format permintaan tidak valid." },
      { status: 400 },
    );
  }

  const result = await laravelFetch<AuthPayload>("/api/v1/auth/login", {
    method: "POST",
    body,
  });

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message, errors: result.errors },
      { status: result.status || 502 },
    );
  }

  await setSessionToken(result.data.token);

  return NextResponse.json({ data: result.data.data });
}
