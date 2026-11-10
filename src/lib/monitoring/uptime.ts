export const DAY_MS = 86_400_000;

export type RawCheck = { checkedAt: Date; ok: boolean; responseMs?: number | null };
export type Rollup = { day: Date; totalChecks: number; upChecks: number; avgResponseMs?: number | null };
export type DayBar = { day: Date; total: number; up: number; uptime: number | null };

export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Uptime % over [from, to). Raw checks count individually. A per-day total counts in proportion
 * to how much of the part of its day that has happened (up to `to`) falls inside the window:
 * a window starting mid-day only takes a share of that day, while today (still in progress)
 * counts fully. Returns null when there is no data at all.
 */
export function uptimePercent(checks: RawCheck[], rollups: Rollup[], from: Date, to: Date): number | null {
  let total = 0;
  let up = 0;
  for (const c of checks) {
    if (c.checkedAt >= from && c.checkedAt < to) {
      total += 1;
      if (c.ok) up += 1;
    }
  }
  for (const r of rollups) {
    const dayStart = startOfUtcDay(r.day).getTime();
    const coveredEnd = Math.min(dayStart + DAY_MS, to.getTime());
    const overlap = coveredEnd - Math.max(dayStart, from.getTime());
    if (overlap <= 0 || r.totalChecks === 0) continue;
    const share = overlap / (coveredEnd - dayStart);
    total += r.totalChecks * share;
    up += r.upChecks * share;
  }
  return total === 0 ? null : (up / total) * 100;
}

/** One bar per UTC day ending today (which is partial: only checks so far). Oldest first. */
export function dailyBars(checks: RawCheck[], rollups: Rollup[], days: number, now: Date): DayBar[] {
  const today = startOfUtcDay(now).getTime();
  const byDay = new Map<number, { total: number; up: number }>();
  const bump = (day: number, total: number, up: number) => {
    const cur = byDay.get(day) ?? { total: 0, up: 0 };
    byDay.set(day, { total: cur.total + total, up: cur.up + up });
  };
  for (const r of rollups) bump(startOfUtcDay(r.day).getTime(), r.totalChecks, r.upChecks);
  for (const c of checks) {
    if (c.checkedAt <= now) bump(startOfUtcDay(c.checkedAt).getTime(), 1, c.ok ? 1 : 0);
  }
  return Array.from({ length: days }, (_, i) => {
    const day = today - (days - 1 - i) * DAY_MS;
    const v = byDay.get(day) ?? { total: 0, up: 0 };
    return { day: new Date(day), total: v.total, up: v.up, uptime: v.total ? (v.up / v.total) * 100 : null };
  });
}

/** 99.95 → "99.95%", 100 → "100%", null → "—". Never rounds a failure up to 100%. */
export function formatUptime(pct: number | null): string {
  if (pct === null) return "—";
  if (pct >= 100) return "100%";
  return `${(Math.floor(pct * 100) / 100).toFixed(2)}%`;
}
