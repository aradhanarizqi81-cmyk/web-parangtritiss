"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/lib/api/client";
import { cn } from "@/components/ui/cn";

export default function LogoutButton({
  variant = "public",
  className,
}: {
  variant?: "public" | "portal" | "menu";
  className?: string;
}) {
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

  const baseClasses =
    variant === "menu"
      ? "site-nav-dropdown-item"
      : "inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      role={variant === "menu" ? "menuitem" : undefined}
      className={cn(
        baseClasses,
        variant === "portal"
          ? "border-ivory/35 text-ivory hover:bg-ivory/10"
          : variant === "public"
            ? "border-line text-ocean hover:border-ocean/40 hover:bg-surface-soft"
            : undefined,
        className,
      )}
    >
      {pending ? "Keluar…" : "Keluar"}
    </button>
  );
}
