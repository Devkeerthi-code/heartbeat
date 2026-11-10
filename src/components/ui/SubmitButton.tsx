"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Props = {
  children: ReactNode;
  pendingLabel: string;
  variant?: "primary" | "default" | "ghost" | "danger";
  size?: "md" | "sm";
  className?: string;
  formAction?: (formData: FormData) => void;
  disabled?: boolean;
};

const VARIANT = { primary: "btn-primary", default: "", ghost: "btn-ghost", danger: "btn-danger" } as const;

/** Submit button that disables itself while its form is submitting, so nothing is sent twice. */
export function SubmitButton({ children, pendingLabel, variant = "default", size = "md", className = "", formAction, disabled }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      formAction={formAction}
      disabled={pending || disabled}
      aria-busy={pending}
      className={`btn ${VARIANT[variant]} ${size === "sm" ? "btn-sm" : ""} ${className}`}
    >
      {pending ? (
        <>
          <span className="spinner" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
