"use client";

import Link from "next/link";
import { useEffect } from "react";

type Props = { error: unknown; retry: () => void };

/** Route-level error boundary. Shows the digest so a log line can be matched, never the raw message. */
export default function RouteError({ error, retry }: Props) {
  const digest = error instanceof Error && "digest" in error && typeof error.digest === "string" ? error.digest : null;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="mx-auto grid w-full max-w-[640px] content-center gap-4 px-4 py-16">
      <p className="prompt">
        <span className="ps1" aria-hidden="true">
          $
        </span>
        heartbeat --retry
      </p>
      <div role="alert" className="flex flex-wrap items-start gap-3 border border-down bg-[var(--down-soft)] px-4 py-3">
        <span className="tag tag-solid bg-down">ERR</span>
        <div className="min-w-0 flex-1">
          <h1 className="m-0 text-md">This page couldn&apos;t load.</h1>
          <p className="prose-text m-0 mt-1 text-sm text-fg-2">
            Usually the database took too long to answer. Your monitors are still being checked and alerts still go out; only this page is
            affected.
          </p>
          {digest ? <p className="m-0 mt-1 text-xs text-fg-3">ref {digest}</p> : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={() => retry()}>
          try again
        </button>
        <Link href="/" className="btn">
          home
        </Link>
      </div>
    </main>
  );
}
