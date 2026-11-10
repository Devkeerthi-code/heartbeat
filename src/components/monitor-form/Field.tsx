import type { ReactNode } from "react";
import { FieldError } from "@/components/ui/FieldError";

type ControlProps = { id: string; "aria-invalid": boolean; "aria-describedby"?: string };

type Props = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  className?: string;
  children: (control: ControlProps) => ReactNode;
};

/** Label + control + hint/error, with the ARIA wiring done once. */
export function Field({ id, label, error, hint, optional, className = "", children }: Props) {
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id} className="field-label">
        {label}
        {optional ? <span className="ml-1.5 font-normal text-fg-3">optional</span> : null}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {error ? (
        <FieldError id={`${id}-err`} message={error} />
      ) : hint ? (
        <span id={`${id}-hint`} className="field-hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
