import { STATUS_TAG, STATUS_WORD, type UiStatus } from "./status";

/** Bracketed status tag. The visible text is the label; the title spells it out. */
export function StatusTag({ status, className = "" }: { status: UiStatus; className?: string }) {
  return (
    <span className={`tag tag-${status} ${className}`} title={STATUS_WORD[status]}>
      {STATUS_TAG[status]}
    </span>
  );
}
