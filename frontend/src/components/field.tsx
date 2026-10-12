import type { ReactNode } from "react";

export default function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-800">
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {hint && !error ? (
        <p className="mt-1 text-xs text-neutral-500">{hint}</p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
