"use client";

import { useEffect } from "react";
import { spring, type Spring } from "./spring";

const pressed = new WeakMap<HTMLElement, Spring>();

/** Gives every `.btn` a springy press (scale 0.96) without wiring each button by hand. */
export function PressSprings() {
  useEffect(() => {
    function onDown(e: PointerEvent) {
      const target = e.target instanceof Element ? e.target.closest<HTMLElement>(".btn") : null;
      if (!target || target.matches(":disabled")) return;
      let s = pressed.get(target);
      if (!s) {
        s = spring({ from: 1, to: 1, onUpdate: (v) => (target.style.transform = v === 1 ? "" : `scale(${v})`) });
        pressed.set(target, s);
      }
      s.set(0.96);
      const release = () => {
        s?.set(1);
        window.removeEventListener("pointerup", release);
        window.removeEventListener("pointercancel", release);
      };
      window.addEventListener("pointerup", release);
      window.addEventListener("pointercancel", release);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}
