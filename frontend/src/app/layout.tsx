import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import { Suspense, type ReactNode } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/site-header";
import "./globals.css";
import "./print.css";

/*
 * Raleway untuk seluruh teks. Judul memakai bobot 300 dan kata penekanan 700,
 * sesuai referensi. Bobot 600 tidak dipakai di tema ini, jadi tidak dimuat.
 */
const raleway = Raleway({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-raleway",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Pantai Parangtritis | Tiket & Kunjungan",
  description:
    "Sistem pendaftaran dan pengelolaan kunjungan wisatawan Pantai Parangtritis.",
};



export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="id"
      data-scroll-behavior="smooth"
      className={`${raleway.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Suspense fallback={<div className="h-20 shrink-0 md:h-24" />}>
          <SiteHeader />
        </Suspense>
        <main className="flex-1">{children}</main>
        <Suspense fallback={<div className="h-16" />}>
          <SiteFooter />
        </Suspense>
      </body>
    </html>
  );
}
