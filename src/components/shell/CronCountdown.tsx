"use client";

import { useEffect, useState } from "react";

const PERIOD_S = 300;

function remaining(): string {
  const s = PERIOD_S - (Math.floor(Date.now() / 1000) % PERIOD_S);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Time to the next 5-minute cron boundary. Rendered after mount so server and client HTML match. */
export function CronCountdown({ className = "" }: { className?: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setText(remaining());
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, []);
  return <span className={className}>{text ?? "–:––"}</span>;
}
