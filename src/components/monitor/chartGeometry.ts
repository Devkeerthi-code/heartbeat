export type SeriesPoint = { t: number; ms: number | null; ok: boolean };

export const CHART_H = 220;
export const PAD = { l: 44, r: 8, t: 52, b: 22 };

export type Geometry = {
  line: string;
  area: string;
  bands: Array<{ x: number; w: number }>;
  ticks: Array<{ y: number; label: string }>;
  p95Y: number | null;
  x: (i: number) => number;
  y: (ms: number) => number;
};

function niceMax(v: number): number {
  const step = v > 2000 ? 1000 : v > 500 ? 250 : 100;
  return Math.max(step, Math.ceil(v / step) * step);
}

/** Pure SVG path maths for the response-time chart: gaps for failures, hatched downtime bands. */
export function chartGeometry(series: SeriesPoint[], width: number): Geometry {
  const values = series.flatMap((p) => (p.ms !== null && p.ok ? [p.ms] : []));
  const max = niceMax(Math.max(1, ...values));
  const span = Math.max(1, series.length - 1);
  const x = (i: number) => PAD.l + (i / span) * (width - PAD.l - PAD.r);
  const y = (ms: number) => PAD.t + (1 - ms / max) * (CHART_H - PAD.t - PAD.b);
  const base = y(0);

  let line = "";
  let area = "";
  let pen = false;
  const bands: Geometry["bands"] = [];
  series.forEach((p, i) => {
    const fail = !p.ok || p.ms === null;
    if (fail) {
      if (pen) area += `L${x(i - 1)} ${base}Z`;
      const last = bands[bands.length - 1];
      const left = x(Math.max(0, i - 0.5));
      const right = x(Math.min(span, i + 0.5));
      if (last && Math.abs(last.x + last.w - left) < 0.5) last.w = right - last.x;
      else bands.push({ x: left, w: Math.max(2, right - left) });
      pen = false;
      return;
    }
    const ms = p.ms ?? 0;
    if (pen) {
      line += `L${x(i)} ${y(ms)}`;
      area += `L${x(i)} ${y(ms)}`;
    } else {
      line += `M${x(i)} ${y(ms)}`;
      area += `M${x(i)} ${base}L${x(i)} ${y(ms)}`;
    }
    pen = true;
  });
  if (pen) area += `L${x(series.length - 1)} ${base}Z`;

  const sorted = [...values].sort((a, b) => a - b);
  const p95 = sorted.length ? (sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? null) : null;
  const ticks = [0, max / 2, max].map((v) => ({ y: y(v), label: v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}` }));
  return { line, area, bands, ticks, p95Y: p95 === null ? null : y(p95), x, y };
}

/** "11-10 14:05 UTC" */
export function pointLabel(t: number): string {
  return `${new Date(t).toISOString().slice(5, 16).replace("T", " ")} UTC`;
}
