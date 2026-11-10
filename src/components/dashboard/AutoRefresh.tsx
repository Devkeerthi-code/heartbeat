"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-fetches server data every minute while the tab is visible, so the board stays live. */
export function AutoRefresh({ everyMs = 60_000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!document.hidden) router.refresh();
    }, everyMs);
    return () => window.clearInterval(id);
  }, [router, everyMs]);
  return null;
}
