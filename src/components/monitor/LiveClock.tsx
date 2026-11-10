"use client";

import { useEffect, useState } from "react";

function hms(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Ticking HH:MM:SS since an instant. Server renders the value at request time; the client keeps it going. */
export function LiveClock({ since, initialSec, className = "" }: { since: string; initialSec: number; className?: string }) {
  const [sec, setSec] = useState(initialSec);
  useEffect(() => {
    const start = new Date(since).getTime();
    const id = window.setInterval(() => setSec((Date.now() - start) / 1000), 1000);
    return () => window.clearInterval(id);
  }, [since]);
  return (
    <span aria-hidden="true" className={className}>
      {hms(sec)}
    </span>
  );
}
