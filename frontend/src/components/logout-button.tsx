"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/lib/api/client";

export default function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);

    try {
      await apiRequest("/api/auth/logout", {});
    } catch {
      // Tidak menghentikan proses keluar; cookie akan dibersihkan server.
    } finally {
      router.replace("/");
      router.refresh();
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className="rounded-md border border-neutral-300 px-3 py-1.5 text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
    >
      {pending ? "Keluar…" : "Keluar"}
    </button>
  );
}
