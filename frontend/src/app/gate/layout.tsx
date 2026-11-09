import type { ReactNode } from "react";
import SiteHeader from "@/components/site-header";

// Header situs memakai cookie sesi, jadi layout ini mengikuti pola dinamis
// yang sama dengan halaman di dalamnya.
export const instant = false;

export default function GateLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-app">
      <SiteHeader />
      {children}
    </div>
  );
}
