import { db } from "@/lib/db";
import { DAY_MS, dailyBars, startOfUtcDay, uptimePercent, type DayBar, type Rollup } from "@/lib/monitoring/uptime";

const HOUR_MS = 3_600_000;

export type UptimeWindows = { h24: number | null; d7: number | null; d30: number | null };

type WindowRow = { monitorId: string; t24: number; u24: number; t7: number; u7: number; t30: number; u30: number };

const pct = (up: number, total: number) => (total ? (up / total) * 100 : null);

/** 24h/7d/30d uptime for many monitors in one aggregate query. Raw checks always cover the last 30 days. */
export async function uptimeWindows(monitorIds: string[], now = new Date()): Promise<Map<string, UptimeWindows>> {
  if (!monitorIds.length) return new Map();
  const d1 = new Date(now.getTime() - DAY_MS);
  const d7 = new Date(now.getTime() - 7 * DAY_MS);
  const d30 = new Date(now.getTime() - 30 * DAY_MS);
  const rows = await db.$queryRaw<WindowRow[]>`
    SELECT "monitorId",
      (count(*) FILTER (WHERE "checkedAt" >= ${d1}))::int AS t24,
      (count(*) FILTER (WHERE "checkedAt" >= ${d1} AND ok))::int AS u24,
      (count(*) FILTER (WHERE "checkedAt" >= ${d7}))::int AS t7,
      (count(*) FILTER (WHERE "checkedAt" >= ${d7} AND ok))::int AS u7,
      count(*)::int AS t30,
      (count(*) FILTER (WHERE ok))::int AS u30
    FROM "Check"
    WHERE "monitorId" = ANY(${monitorIds}) AND "checkedAt" >= ${d30} AND "checkedAt" <= ${now}
    GROUP BY "monitorId"`;
  return new Map(rows.map((r) => [r.monitorId, { h24: pct(r.u24, r.t24), d7: pct(r.u7, r.t7), d30: pct(r.u30, r.t30) }]));
}

/** Last N response times per monitor (oldest first), for sparklines. */
async function recentResponseTimes(monitorIds: string[], n: number): Promise<Map<string, Array<{ ms: number | null; ok: boolean }>>> {
  if (!monitorIds.length) return new Map();
  const rows = await db.$queryRaw<Array<{ monitorId: string; responseMs: number | null; ok: boolean }>>`
    SELECT m.id AS "monitorId", c."responseMs", c.ok
    FROM unnest(${monitorIds}::text[]) AS m(id)
    CROSS JOIN LATERAL (
      SELECT "responseMs", ok, "checkedAt" FROM "Check" WHERE "monitorId" = m.id ORDER BY "checkedAt" DESC LIMIT ${n}
    ) c
    ORDER BY m.id, c."checkedAt" ASC`;
  const out = new Map<string, Array<{ ms: number | null; ok: boolean }>>();
  for (const r of rows) {
    const list = out.get(r.monitorId) ?? [];
    list.push({ ms: r.responseMs, ok: r.ok });
    out.set(r.monitorId, list);
  }
  return out;
}

/** Per-day totals for the last 90 days: rollups for old days plus raw checks grouped by day. */
async function dayTotals(monitorIds: string[], now: Date): Promise<Map<string, Rollup[]>> {
  const from = new Date(startOfUtcDay(now).getTime() - 89 * DAY_MS);
  const out = new Map<string, Rollup[]>();
  if (!monitorIds.length) return out;
  const [rollups, raw] = await Promise.all([
    db.dailyRollup.findMany({ where: { monitorId: { in: monitorIds }, day: { gte: from } } }),
    db.$queryRaw<Array<{ monitorId: string; day: Date; total: number; up: number }>>`
      SELECT "monitorId", "checkedAt"::date AS day, count(*)::int AS total, (count(*) FILTER (WHERE ok))::int AS up
      FROM "Check" WHERE "monitorId" = ANY(${monitorIds}) AND "checkedAt" >= ${from} AND "checkedAt" <= ${now}
      GROUP BY "monitorId", "checkedAt"::date`,
  ]);
  const push = (id: string, r: Rollup) => out.set(id, [...(out.get(id) ?? []), r]);
  for (const r of rollups) push(r.monitorId, r);
  for (const r of raw) push(r.monitorId, { day: r.day, totalChecks: r.total, upChecks: r.up });
  return out;
}

export async function getProjectsForUser(userId: string) {
  return db.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, slug: true, note: true, _count: { select: { monitors: true } } },
  });
}

export async function getDashboard(userId: string, projectId: string | undefined) {
  const projects = await getProjectsForUser(userId);
  const project = projects.find((p) => p.id === projectId) ?? projects[0] ?? null;
  if (!project) return { projects, project: null, monitors: [], incidents: [] };

  const monitors = await db.monitor.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, name: true, url: true, status: true, paused: true, intervalMinutes: true, lastCheckedAt: true,
      lastResponseMs: true, lastError: true, consecutiveFailures: true, sslExpiresAt: true, checkSsl: true,
    },
  });
  const ids = monitors.map((m) => m.id);
  const [windows, sparks, incidents] = await Promise.all([
    uptimeWindows(ids),
    recentResponseTimes(ids, 36),
    db.incident.findMany({
      where: { monitorId: { in: ids } },
      orderBy: { startedAt: "desc" },
      take: 12,
      select: { id: true, startedAt: true, resolvedAt: true, durationSec: true, cause: true, monitor: { select: { id: true, name: true } } },
    }),
  ]);
  const severity = { DOWN: 0, PENDING: 2, UP: 3 } as const;
  const rows = monitors
    .map((m) => ({ ...m, uptime: windows.get(m.id) ?? { h24: null, d7: null, d30: null }, spark: sparks.get(m.id) ?? [] }))
    .sort((a, b) => severity[a.status] - severity[b.status] || Number(a.paused) - Number(b.paused));
  return { projects, project, monitors: rows, incidents };
}

export type ChartPoint = { t: number; ms: number | null; ok: boolean };
export type ChartRange = "24h" | "7d" | "30d";

const RANGE: Record<ChartRange, { ms: number; bucket: "raw" | "hour" | "sixhour" }> = {
  "24h": { ms: DAY_MS, bucket: "raw" },
  "7d": { ms: 7 * DAY_MS, bucket: "hour" },
  "30d": { ms: 30 * DAY_MS, bucket: "sixhour" },
};

/** Response-time series, bucketed so the chart never gets more than ~300 points. */
async function responseSeries(monitorId: string, range: ChartRange, now: Date): Promise<ChartPoint[]> {
  const { ms, bucket } = RANGE[range];
  const from = new Date(now.getTime() - ms);
  if (bucket === "raw") {
    const rows = await db.check.findMany({
      where: { monitorId, checkedAt: { gte: from } },
      orderBy: { checkedAt: "asc" },
      select: { checkedAt: true, responseMs: true, ok: true },
    });
    return rows.map((r) => ({ t: r.checkedAt.getTime(), ms: r.ok ? r.responseMs : null, ok: r.ok }));
  }
  const width = bucket === "hour" ? HOUR_MS : 6 * HOUR_MS;
  const rows = await db.$queryRaw<Array<{ b: number; ms: number | null; failures: number }>>`
    SELECT floor(extract(epoch FROM "checkedAt") * 1000 / ${width})::bigint * ${width} AS b,
           round(avg("responseMs") FILTER (WHERE ok))::int AS ms,
           (count(*) FILTER (WHERE NOT ok))::int AS failures
    FROM "Check" WHERE "monitorId" = ${monitorId} AND "checkedAt" >= ${from}
    GROUP BY 1 ORDER BY 1`;
  return rows.map((r) => ({ t: Number(r.b), ms: r.ms, ok: r.failures === 0 }));
}

export async function getMonitorDetail(userId: string, monitorId: string, range: ChartRange) {
  const monitor = await db.monitor.findFirst({
    where: { id: monitorId, project: { ownerId: userId } },
    include: { project: { select: { id: true, name: true, slug: true } } },
  });
  if (!monitor) return null;
  const now = new Date();
  const [series, windows, incidents, days] = await Promise.all([
    responseSeries(monitor.id, range, now),
    uptimeWindows([monitor.id], now),
    db.incident.findMany({ where: { monitorId: monitor.id }, orderBy: { startedAt: "desc" }, take: 50 }),
    dayTotals([monitor.id], now),
  ]);
  const totals = days.get(monitor.id) ?? [];
  return {
    monitor,
    series,
    uptime: windows.get(monitor.id) ?? { h24: null, d7: null, d30: null },
    incidents,
    bars: dailyBars([], totals, 90, now),
  };
}

export type PublicMonitor = { id: string; name: string; status: "PENDING" | "UP" | "DOWN"; paused: boolean; bars: DayBar[]; uptime90: number | null };

/** Public status page data. Deliberately omits URLs, error strings and response details. */
export async function getStatusPage(slug: string) {
  const project = await db.project.findUnique({
    where: { slug },
    select: { id: true, name: true, note: true, noteUpdatedAt: true, monitors: { orderBy: { createdAt: "asc" }, select: { id: true, name: true, status: true, paused: true } } },
  });
  if (!project) return null;
  const now = new Date();
  const ids = project.monitors.map((m) => m.id);
  const [days, incidents] = await Promise.all([
    dayTotals(ids, now),
    db.incident.findMany({
      where: { monitorId: { in: ids }, startedAt: { gte: new Date(now.getTime() - 90 * DAY_MS) } },
      orderBy: { startedAt: "desc" },
      take: 30,
      select: { id: true, startedAt: true, resolvedAt: true, durationSec: true, monitor: { select: { name: true } } },
    }),
  ]);
  const from90 = new Date(startOfUtcDay(now).getTime() - 89 * DAY_MS);
  const monitors: PublicMonitor[] = project.monitors.map((m) => {
    const totals = days.get(m.id) ?? [];
    return { ...m, bars: dailyBars([], totals, 90, now), uptime90: uptimePercent([], totals, from90, now) };
  });
  return { project, monitors, incidents, generatedAt: now };
}
