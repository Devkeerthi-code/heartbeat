export const ALLOWED_INTERVALS = [5, 10, 30, 60] as const;
export type IntervalMinutes = (typeof ALLOWED_INTERVALS)[number];

export type SchedulableMonitor = {
  id: string;
  paused: boolean;
  nextCheckAt: Date;
  claimedUntil: Date | null;
};

const MINUTE = 60_000;

export function isDue(monitor: SchedulableMonitor, now: Date): boolean {
  if (monitor.paused) return false;
  if (monitor.claimedUntil && monitor.claimedUntil > now) return false;
  return monitor.nextCheckAt <= now;
}

/** Most overdue first, so a backlog drains fairly across runs. */
export function selectDueMonitors<T extends SchedulableMonitor>(monitors: T[], now: Date, limit: number): T[] {
  return monitors
    .filter((m) => isDue(m, now))
    .sort((a, b) => a.nextCheckAt.getTime() - b.nextCheckAt.getTime())
    .slice(0, limit);
}

/**
 * Next run time. A 30s grace window keeps a monitor from drifting a whole cron tick late
 * when the 5-minute cron fires a few seconds early or late.
 */
export function computeNextCheckAt(checkedAt: Date, intervalMinutes: number): Date {
  return new Date(checkedAt.getTime() + intervalMinutes * MINUTE - 30_000);
}
