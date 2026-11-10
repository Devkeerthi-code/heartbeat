import { msLabel, timeAgo } from "@/components/format";
import { uiStatus, uptimeTone } from "@/components/monitor/status";
import { daysUntil, shouldWarnSsl } from "@/lib/alerts/plan";
import { formatUptime } from "@/lib/monitoring/uptime";
import type { getDashboard } from "@/lib/queries";
import type { MonitorRow } from "./types";

type DashboardMonitor = Awaited<ReturnType<typeof getDashboard>>["monitors"][number];

function hostOf(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function toRow(m: DashboardMonitor, now: Date): MonitorRow {
  const status = uiStatus(m);
  const windows: Array<[string, number | null]> = [
    ["24h", m.uptime.h24],
    ["7d", m.uptime.d7],
    ["30d", m.uptime.d30],
  ];
  const last =
    status === "paused" ? "paused" : status === "pending" ? "…" : status === "down" ? "failing" : msLabel(m.lastResponseMs);
  const lastSub = status === "down" ? (m.lastError ?? "no response") : status === "pending" ? "first check soon" : timeAgo(m.lastCheckedAt, now);
  return {
    id: m.id,
    name: m.name,
    host: hostOf(m.url),
    status,
    uptime: windows.map(([label, pct]) => ({ label, text: formatUptime(pct), tone: uptimeTone(pct) })),
    spark: m.spark,
    last,
    lastSub,
    sslDays: m.checkSsl && m.sslExpiresAt && shouldWarnSsl(m.sslExpiresAt, now) ? daysUntil(m.sslExpiresAt, now) : null,
  };
}
