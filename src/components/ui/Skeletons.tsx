import type { ReactNode } from "react";

/** Loading placeholders shaped like the real layout (dotted, terminal-style; no rounded blobs). */
export function HeaderSkeleton() {
  return (
    <div className="mb-4 grid gap-2">
      <span className="skeleton w-[260px] max-w-[70%]" />
      <span className="skeleton h-7 w-[180px]" />
    </div>
  );
}

export function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="pane m-0 list-none p-0">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="grid grid-cols-[56px_1fr_80px] items-center gap-4 border-b border-line px-4 py-3.5 last:border-b-0 md:grid-cols-[56px_1fr_160px_64px]">
          <span className="skeleton" />
          <span className="grid gap-1.5">
            <span className="skeleton w-2/5" />
            <span className="skeleton h-2 w-3/5" />
          </span>
          <span className="skeleton max-md:hidden" />
          <span className="skeleton" />
        </li>
      ))}
    </ul>
  );
}

export function Loading({ what, children }: { what: string; children: ReactNode }) {
  return (
    <div aria-busy="true">
      <span role="status" className="sr-only">
        Loading {what}…
      </span>
      {children}
    </div>
  );
}
