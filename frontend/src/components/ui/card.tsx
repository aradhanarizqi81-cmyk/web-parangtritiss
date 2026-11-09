import type { ReactNode } from "react";
import { cn } from "./cn";

/*
 * Bentuk kartu (radius, garis, latar, bayangan) dimiliki kelas `card-surface`
 * di globals.css supaya panel yang ditulis langsung di halaman memakai bentuk
 * yang sama tanpa menyalin empat kelas Tailwind.
 */
export default function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("card-surface p-5 sm:p-6", className)}>{children}</div>
  );
}
