import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/*
 * Radius sengaja tidak seragam: tombol dan input memakai rounded-md (6px),
 * kartu rounded-lg (8px), dan hanya lencana status yang tetap pill. Perbedaan
 * radius ini menjadi penanda hierarki, bukan variasi acak.
 */
const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-ocean text-ivory hover:bg-ocean-dark",
  secondary:
    "border border-line bg-surface text-ocean shadow-card hover:border-ocean/40 hover:bg-surface-soft",
  ghost: "text-ocean hover:bg-surface-soft",
  danger: "bg-danger text-white hover:brightness-90",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-12 px-6 text-base",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export default function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, className })}
      {...props}
    />
  );
}
