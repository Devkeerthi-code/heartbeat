"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/components/motion/spring";
import { Trace, type BeatKind } from "./trace";

type Props = { beats: BeatKind[]; height?: number; className?: string };

function readColors(): string[] {
  const css = getComputedStyle(document.documentElement);
  return ["--trace", "--slow", "--down", "--text-3"].map((v) => css.getPropertyValue(v).trim());
}

/**
 * Live ECG strip. Pauses when off-screen or when the tab is hidden; draws one static strip
 * under prefers-reduced-motion. Purely decorative, so it's hidden from assistive tech.
 */
export function EcgTrace({ beats, height = 112, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beatsRef = useRef(beats);

  useEffect(() => {
    beatsRef.current = beats;
  }, [beats]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = prefersReducedMotion();
    const trace = new Trace(canvas, () => beatsRef.current);
    trace.colors = readColors();
    trace.resize(reduced);

    let visible = true;
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      trace.step(Math.min(0.05, (now - last) / 1000));
      last = now;
      raf = requestAnimationFrame(loop);
    };
    const play = () => {
      if (reduced || raf || !visible || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const pause = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const ro = new ResizeObserver(() => trace.resize(reduced));
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) play();
      else pause();
    });
    io.observe(canvas);
    const onVisibility = () => (document.hidden ? pause() : play());
    document.addEventListener("visibilitychange", onVisibility);
    const theme = new MutationObserver(() => {
      trace.colors = readColors();
      trace.resize(reduced);
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    play();

    return () => {
      pause();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      theme.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} style={{ height }} />;
}
