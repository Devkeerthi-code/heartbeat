"use client";

import { useEffect, useRef, useState } from "react";
import { EcgTrace } from "@/components/ecg/EcgTrace";
import { prefersReducedMotion, spring, type Spring } from "@/components/motion/spring";
import { StatusTag } from "@/components/monitor/StatusTag";

type Phase = "up" | "failing" | "alerted" | "recovered";

/** Scripted illustration: a site goes down, two checks fail, the alert email lands, it recovers. */
const SCRIPT: Array<{ phase: Phase; at: number }> = [
  { phase: "failing", at: 5000 },
  { phase: "alerted", at: 7000 },
  { phase: "recovered", at: 10500 },
  { phase: "up", at: 13500 },
];
const LOOP_MS = 14500;

export function LandingTrace() {
  const [phase, setPhase] = useState<Phase>("up");
  const popRef = useRef<HTMLDivElement>(null);
  const popSpring = useRef<Spring | null>(null);
  const down = phase === "failing" || phase === "alerted";

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timers: number[] = [];
    const run = () => {
      for (const step of SCRIPT) timers.push(window.setTimeout(() => setPhase(step.phase), step.at));
      timers.push(window.setTimeout(run, LOOP_MS));
    };
    run();
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  useEffect(() => {
    const el = popRef.current;
    if (!el) return;
    const target = phase === "alerted" || phase === "recovered" ? 1 : 0;
    const apply = (x: number) => {
      el.style.opacity = String(Math.min(1, Math.max(0, x)));
      el.style.transform = `translateY(${(1 - x) * 16}px) scale(${0.96 + 0.04 * x})`;
    };
    if (!popSpring.current) popSpring.current = spring({ from: 0, to: target, onUpdate: apply });
    else popSpring.current.set(target);
  }, [phase]);

  return (
    <figure className="relative m-0">
      <div className="vitals crt">
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 pt-2 text-xs text-fg-2">
          <span className="flex items-center gap-2">
            <span className="label-badge">ILLUSTRATION</span> your-site.vercel.app
          </span>
          <span aria-hidden="true" className={down ? "glitch" : ""} key={down ? "down" : "up"}>
            <StatusTag status={down ? "down" : "up"} />
          </span>
        </div>
        <EcgTrace beats={[down ? "down" : "up"]} height={120} />
      </div>
      <div
        ref={popRef}
        aria-hidden="true"
        className="pointer-events-none absolute right-2 -bottom-9 left-2 z-[2] border border-down bg-surface-3 px-3 py-2 text-sm opacity-0 shadow-[var(--shadow-pop)] sm:left-auto sm:right-4 sm:-bottom-6 sm:w-[290px]"
      >
        <div className="flex justify-between border-b border-dashed border-line-strong pb-1 text-xs text-fg-3">
          <span>mail · heartbeat alerts</span>
          <span>{phase === "recovered" ? "14:12" : "14:02"}</span>
        </div>
        <strong className="mt-1 block font-semibold">{phase === "recovered" ? "your-site is back up" : "your-site is down"}</strong>
        <p className="m-0 mt-0.5 text-xs text-fg-2">
          {phase === "recovered" ? "Down for 10 min. Back to 200 OK in 291 ms." : "2 checks failed in a row: expected 200, got 503."}
        </p>
      </div>
      <figcaption className="sr-only">
        Illustration: a monitored site goes down, Heartbeat emails you after two failed checks, then emails again when it recovers.
      </figcaption>
    </figure>
  );
}
