import type { ReactNode } from "react";

type Props = { user?: string; children: ReactNode; className?: string };

/** Decorative shell prompt above each page title. The h1 below carries the meaning. */
export function Prompt({ user = "you", children, className = "" }: Props) {
  return (
    <p className={`prompt type-on ${className}`}>
      <span className="ps1" aria-hidden="true">
        {user}@heartbeat:~$
      </span>
      {children}
    </p>
  );
}
