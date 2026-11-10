import type { UiStatus } from "./status";

type Point = { ms: number | null; ok: boolean };

const FILL: Record<UiStatus, string> = {
  up: "fill-accent-ink",
  slow: "fill-slow",
  down: "fill-fg-3",
  pending: "fill-fg-3",
  paused: "fill-fg-3",
};

/** Stepped block sparkline (8 levels, like ▁▂▃▅▇). Failed checks are a short red tick on the baseline. */
export function Sparkline({ points, status, className = "" }: { points: Point[]; status: UiStatus; className?: string }) {
  const n = Math.max(points.length, 24);
  const offset = n - points.length;
  const max = Math.max(1, ...points.map((p) => p.ms ?? 0));
  return (
    <svg viewBox={`0 0 ${n} 8`} preserveAspectRatio="none" aria-hidden="true" className={`block h-[18px] w-full ${FILL[status]} ${className}`}>
      {points.map((p, i) => {
        const x = i + offset;
        if (!p.ok || p.ms === null) return <rect key={i} x={x + 0.25} y={7.2} width={0.5} height={0.8} className="fill-down" />;
        const level = Math.min(8, 1 + Math.floor((p.ms / max) * 7.99));
        return <rect key={i} x={x} y={8 - level} width={0.8} height={level} />;
      })}
    </svg>
  );
}
