import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense, type ReactNode } from "react";
import SiteHeader from "@/components/site-header";
import "./globals.css";
import "./print.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pantai Parangtritis — Tiket & Kunjungan",
  description:
    "Sistem pendaftaran dan pengelolaan kunjungan wisatawan Pantai Parangtritis.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="id"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Suspense
          fallback={
            <header className="border-b border-line bg-background py-3.5" />
          }
        >
          <SiteHeader />
        </Suspense>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line bg-surface py-4 text-center text-sm text-muted print:hidden">
          Prototipe pengembangan — tarif bersifat konfigurasi awal, bukan tarif resmi.
        </footer>
      </body>
    </html>
  );
}
