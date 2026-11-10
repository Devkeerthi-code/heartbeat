"use client";

import { useEffect, useRef } from "react";
import { spring } from "@/components/motion/spring";
import { dismissToast, type ToastItem } from "./store";

const LABEL = { ok: " OK ", error: "FAIL", warn: "WARN" } as const;
const TAG_BG = { ok: "bg-up", error: "bg-down", warn: "bg-slow" } as const;
const AUTO_DISMISS_MS = 5000;
const FLING_PX = 90;
const FLING_VELOCITY = 700;

/** Springs in from below; drag or flick right to dismiss. Dragging left is rubber-banded. */
export function Toast({ item }: { item: ToastItem }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let x = 0;
    let y = 24;
    let gone = false;
    const apply = () => {
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.opacity = String(Math.max(0, 1 - Math.abs(x) / 260) * Math.max(0, 1 - y / 40));
    };
    apply();
    spring({ from: 24, to: 0, preset: "toast", onUpdate: (v) => ((y = v), apply()) });

    const leave = (velocity = 0) => {
      if (gone) return;
      gone = true;
      window.clearTimeout(timer);
      spring({ from: x, to: 420, velocity, preset: "toast", onUpdate: (v) => ((x = v), apply()), onDone: () => dismissToast(item.id) });
    };
    let timer = window.setTimeout(leave, AUTO_DISMISS_MS);

    let startX: number | null = null;
    let lastX = 0;
    let lastT = 0;
    let vel = 0;
    const down = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest("button")) return;
      startX = e.clientX - x;
      lastX = e.clientX;
      lastT = e.timeStamp;
      el.setPointerCapture(e.pointerId);
      window.clearTimeout(timer);
    };
    const move = (e: PointerEvent) => {
      if (startX === null) return;
      const nx = e.clientX - startX;
      x = nx > 0 ? nx : nx * 0.35;
      vel = ((e.clientX - lastX) / Math.max(1, e.timeStamp - lastT)) * 1000;
      lastX = e.clientX;
      lastT = e.timeStamp;
      apply();
    };
    const up = () => {
      if (startX === null) return;
      startX = null;
      if (x > FLING_PX || vel > FLING_VELOCITY) return leave(Math.max(vel, 600));
      spring({ from: x, to: 0, velocity: vel, preset: "toast", onUpdate: (v) => ((x = v), apply()) });
      timer = window.setTimeout(leave, AUTO_DISMISS_MS / 2);
    };
    const pause = () => window.clearTimeout(timer);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("focusin", pause);
    el.addEventListener("mouseenter", pause);
    return () => {
      window.clearTimeout(timer);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("focusin", pause);
      el.removeEventListener("mouseenter", pause);
    };
  }, [item.id]);

  return (
    <div ref={ref} role={item.kind === "error" ? "alert" : "status"} className={`toast ${item.kind === "error" ? "toast-error" : ""}`}>
      <span aria-hidden="true" className={`tag tag-solid mt-0.5 self-start ${TAG_BG[item.kind]}`}>
        {LABEL[item.kind]}
      </span>
      <div className="min-w-0">
        <strong className="block font-semibold">{item.title}</strong>
        {item.body ? <p className="prose-text mt-0.5 text-sm/[22px] text-fg-2">{item.body}</p> : null}
      </div>
      <button type="button" aria-label="Dismiss notification" onClick={() => dismissToast(item.id)} className="grid size-6 cursor-pointer place-items-center text-fg-3 hover:text-fg">
        x
      </button>
    </div>
  );
}
