import { DAY_MS, startOfUtcDay, type RawCheck, type Rollup } from "./uptime";

export const RAW_RETENTION_DAYS = 30;

/** Checks strictly before this instant get folded into daily rollups. Always a UTC midnight. */
export function rollupCutoff(now: Date): Date {
  return new Date(startOfUtcDay(now).getTime() - RAW_RETENTION_DAYS * DAY_MS);
}

export type MonitorCheck = RawCheck & { monitorId: string };
export type MonitorRollup = Rollup & { monitorId: string };

export function aggregateChecks(checks: MonitorCheck[]): MonitorRollup[] {
  const groups = new Map<string, { monitorId: string; day: Date; total: number; up: number; msSum: number; msCount: number }>();
  for (const c of checks) {
    const day = startOfUtcDay(c.checkedAt);
    const key = `${c.monitorId}|${day.getTime()}`;
    const g = groups.get(key) ?? { monitorId: c.monitorId, day, total: 0, up: 0, msSum: 0, msCount: 0 };
    g.total += 1;
    if (c.ok) g.up += 1;
    if (c.ok && typeof c.responseMs === "number") {
      g.msSum += c.responseMs;
      g.msCount += 1;
    }
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => ({
    monitorId: g.monitorId,
    day: g.day,
    totalChecks: g.total,
    upChecks: g.up,
    avgResponseMs: g.msCount ? Math.round(g.msSum / g.msCount) : null,
  }));
}

/** Merges a new rollup into an existing one for the same day (late checks), weighting the average. */
export function mergeRollups(existing: Rollup, incoming: Rollup): Rollup {
  const total = existing.totalChecks + incoming.totalChecks;
  const ea = existing.avgResponseMs ?? null;
  const ia = incoming.avgResponseMs ?? null;
  let avg: number | null = ea ?? ia;
  if (ea !== null && ia !== null) {
    avg = Math.round((ea * existing.upChecks + ia * incoming.upChecks) / Math.max(1, existing.upChecks + incoming.upChecks));
  }
  return { day: existing.day, totalChecks: total, upChecks: existing.upChecks + incoming.upChecks, avgResponseMs: avg };
}
