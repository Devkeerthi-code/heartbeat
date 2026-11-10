"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { spring, type Spring } from "@/components/motion/spring";

export type Bar = { day: string; total: number; up: number; uptime: number | null };

type Props = { bars: Bar[]; label: string };

const SWELL = 0.32;
const SIGMA2 = 1.5;

function kind(b: Bar): "up" | "slow" | "down" | "none" {
  if (b.uptime === null) return "none";
  if (b.uptime >= 99.9) return "up";
  return b.uptime >= 95 ? "slow" : "down";
}

const CLASS = { up: "", slow: "bar-slow", down: "bar-down", none: "bar-none" } as const;
const WORD = { up: "No downtime", slow: "Some failed checks", down: "Mostly down", none: "Not monitored" } as const;

function dayText(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** 90 daily bars. Bars near the pointer swell on a spring (dock-style); tooltip follows on a spring. */
export function UptimeBars({ bars, label }: Props) {
  const rowRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const springs = useRef<Array<Spring | null>>([]);
  const tipX = useRef<Spring | null>(null);
  const tipY = useRef(0);
  const [sel, setSel] = useState<number | null>(null);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const els = Array.from(row.children) as HTMLElement[];
    els.forEach((el, j) => {
      const target = sel === null ? 1 : 1 + SWELL * Math.exp(-((j - sel) ** 2) / (2 * SIGMA2));
      const s = springs.current[j];
      if (s) s.set(target);
      else if (target !== 1) springs.current[j] = spring({ from: 1, to: target, preset: "bar", onUpdate: (v) => (el.style.transform = v === 1 ? "" : `scaleY(${v})`) });
    });

    const tip = tipRef.current;
    const barEl = sel === null ? null : els[sel];
    if (!tip || !barEl) return;
    const r = barEl.getBoundingClientRect();
    const tx = Math.max(8, Math.min(window.innerWidth - tip.offsetWidth - 8, r.left + r.width / 2 - tip.offsetWidth / 2));
    tipY.current = r.top - tip.offsetHeight - 14;
    const place = (x: number) => (tip.style.transform = `translate(${x}px, ${tipY.current}px)`);
    if (tipX.current) tipX.current.set(tx);
    else tipX.current = spring({ from: tx, to: tx, preset: "tip", onUpdate: place });
    place(tipX.current.value);
  }, [sel]);

  useEffect(() => {
    const hide = () => setSel(null);
    window.addEventListener("scroll", hide, { passive: true });
    return () => window.removeEventListener("scroll", hide);
  }, []);

  const indexAt = (clientX: number) => {
    const r = rowRef.current?.getBoundingClientRect();
    if (!r) return null;
    return Math.max(0, Math.min(bars.length - 1, Math.floor(((clientX - r.left) / r.width) * bars.length)));
  };
  const onPointer = (e: PointerEvent<HTMLDivElement>) => setSel(indexAt(e.clientX));
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, PageUp: -7, PageDown: 7 }[e.key];
    const from = sel ?? bars.length - 1;
    if (step !== undefined) {
      e.preventDefault();
      setSel(Math.max(0, Math.min(bars.length - 1, from + step)));
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setSel(e.key === "Home" ? 0 : bars.length - 1);
    } else if (e.key === "Escape") setSel(null);
  };

  const b = sel === null ? null : bars[sel];
  return (
    <div>
      <div
        ref={rowRef}
        tabIndex={0}
        role="group"
        aria-label={`${label}. Use left and right arrow keys to read each day.`}
        className="bars"
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={(e) => e.pointerType === "mouse" && setSel(null)}
        onFocus={() => setSel(bars.length - 1)}
        onBlur={() => setSel(null)}
        onKeyDown={onKey}
      >
        {bars.map((bar, i) => (
          <span key={bar.day} className={`bar ${CLASS[kind(bar)]}`} data-sel={i === sel} />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-fg-3" aria-hidden="true">
        <span>{bars.length} days ago</span>
        <span>today</span>
      </div>
      <div ref={tipRef} role="status" className="tooltip" style={{ visibility: b ? "visible" : "hidden" }}>
        {b ? (
          <>
            <strong className="mb-1 block text-sm">
              {dayText(b.day)}
              {sel === bars.length - 1 ? " · today" : ""}
            </strong>
            <span className="flex justify-between gap-3 text-fg-2">
              <span>{WORD[kind(b)]}</span>
              <b className="text-fg">{b.uptime === null ? "—" : `${(Math.floor(b.uptime * 100) / 100).toFixed(2)}%`}</b>
            </span>
            {b.total ? (
              <span className="flex justify-between gap-3 text-fg-2">
                <span>checks passed</span>
                <b className="text-fg">
                  {b.up}/{b.total}
                </b>
              </span>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
