import type { ReactNode } from "react";
import { cn } from "./cn";

export type BadgeTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent";

/*
 * Lencana tetap pill karena bentuknya membedakan label status dari tombol dan
 * kartu. Warna memakai token status semantik, bukan hex lepas per halaman.
 */
const TONES: Record<BadgeTone, string> = {
  neutral: "border-line bg-surface-soft text-foreground",
  success: "border-success/25 bg-success-soft text-success",
  warning: "border-warning/25 bg-warning-soft text-warning",
  danger: "border-danger/25 bg-danger-soft text-danger",
  info: "border-info/25 bg-info-soft text-info",
  accent: "border-accent/25 bg-accent-soft text-accent",
};

export default function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
