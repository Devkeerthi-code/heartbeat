"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { CHART_H, PAD, chartGeometry, pointLabel, type SeriesPoint } from "./chartGeometry";

type Props = { series: SeriesPoint[]; rangeLabel: string };

/** Response-time chart: glow line, p95 guide, hatched downtime, crosshair readout (mouse, touch, ←/→). */
export function ResponseChart({ series, rangeLabel }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(800);
  const [sel, setSel] = useState<number | null>(null);
  const geo = useMemo(() => chartGeometry(series, width), [series, width]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(240, Math.round(entry.contentRect.width)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!series.length) {
    return <p className="m-0 px-4 py-10 text-center text-sm text-fg-3">No checks in the last {rangeLabel} yet. The first one runs within 5 minutes.</p>;
  }

  const clamp = (i: number) => Math.max(0, Math.min(series.length - 1, i));
  const onPointer = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const fx = ((e.clientX - r.left) / r.width) * width;
    setSel(clamp(Math.round(((fx - PAD.l) / (width - PAD.l - PAD.r)) * (series.length - 1))));
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const step = e.shiftKey ? 12 : 1;
    const from = sel ?? series.length - 1;
    const next = e.key === "ArrowRight" ? from + step : e.key === "ArrowLeft" ? from - step : e.key === "Home" ? 0 : e.key === "End" ? series.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    setSel(clamp(next));
  };

  const point = sel === null ? null : series[sel];
  const first = series[0];
  return (
    <div className="relative px-4 pt-3 pb-2">
      <div aria-live="polite" className="pointer-events-none absolute top-3 right-4 text-right text-xs text-fg-3">
        {point ? (
          <>
            <b className={`block text-lg font-bold ${point.ok ? "text-fg" : "text-down"}`}>{point.ok && point.ms !== null ? `${point.ms} ms` : "failed"}</b>
            {pointLabel(point.t)}
          </>
        ) : (
          "hover, tap or ←/→"
        )}
      </div>
      <svg
        ref={svgRef}
        role="img"
        tabIndex={0}
        aria-label={`Response time over the last ${rangeLabel}. Use left and right arrow keys to read each point.`}
        viewBox={`0 0 ${width} ${CHART_H}`}
        className="block h-[220px] w-full touch-pan-y"
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={(e) => e.pointerType === "mouse" && setSel(null)}
        onKeyDown={onKey}
        onBlur={() => setSel(null)}
      >
        <defs>
          <linearGradient id="hb-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent-ink)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--accent-ink)" stopOpacity="0" />
          </linearGradient>
          <pattern id="hb-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--down)" opacity="0.08" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--down)" strokeWidth="2" opacity="0.55" />
          </pattern>
        </defs>
        {geo.ticks.map((t) => (
          <g key={t.label}>
            <line x1={PAD.l} x2={width - PAD.r} y1={t.y} y2={t.y} stroke="var(--border)" strokeDasharray="1 3" />
            <text x={PAD.l - 6} y={t.y + 4} textAnchor="end" fill="var(--text-3)" fontSize="10">
              {t.label}
            </text>
          </g>
        ))}
        {geo.bands.map((b) => (
          <rect key={b.x} x={b.x} y={PAD.t} width={b.w} height={CHART_H - PAD.t - PAD.b} fill="url(#hb-hatch)" />
        ))}
        <path d={geo.area} fill="url(#hb-area)" />
        <path d={geo.line} fill="none" stroke="var(--accent-ink)" strokeWidth="1.5" className="drop-shadow-[var(--glow)]" />
        {geo.p95Y !== null ? <line x1={PAD.l} x2={width - PAD.r} y1={geo.p95Y} y2={geo.p95Y} stroke="var(--text-3)" strokeDasharray="4 4" /> : null}
        {first ? (
          <text x={PAD.l} y={CHART_H - 4} fill="var(--text-3)" fontSize="10">
            {pointLabel(first.t)}
          </text>
        ) : null}
        <text x={width - PAD.r} y={CHART_H - 4} textAnchor="end" fill="var(--text-3)" fontSize="10">
          now
        </text>
        {point && sel !== null ? (
          <g>
            <line x1={geo.x(sel)} x2={geo.x(sel)} y1={PAD.t} y2={CHART_H - PAD.b} stroke="var(--text-2)" strokeDasharray="2 2" />
            {point.ok && point.ms !== null ? <circle cx={geo.x(sel)} cy={geo.y(point.ms)} r="4" fill="var(--accent-ink)" stroke="var(--surface)" strokeWidth="2" /> : null}
          </g>
        ) : null}
      </svg>
      <div className="flex flex-wrap gap-4 pt-1 pb-2 text-xs text-fg-3">
        <span className="inline-flex items-center gap-1.5">
          <i aria-hidden="true" className="w-3.5 border-t-2 border-accent-ink" /> response time
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i aria-hidden="true" className="w-3.5 border-t border-dashed border-fg-3" /> p95
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i aria-hidden="true" className="h-2.5 w-3.5 bg-[repeating-linear-gradient(45deg,var(--down)_0_2px,transparent_2px_5px)]" /> failed checks
        </span>
      </div>
    </div>
  );
}
