import { daysUntil } from "@/lib/alerts/plan";
import { formatUptime } from "@/lib/monitoring/uptime";
import type { UptimeWindows } from "@/lib/queries";
import { uptimeTone } from "./status";

type Props = { uptime: UptimeWindows; avgMs: number | null; rangeLabel: string; sslExpiresAt: Date | null; checkSsl: boolean; now: Date };

function Meter({ pct, tone }: { pct: number; tone: string }) {
  return (
    <span className="meter" aria-hidden="true">
      <i style={{ width: `${Math.max(0, Math.min(100, pct))}%`, ["--meter" as string]: tone }} />
    </span>
  );
}

function meterTone(pct: number | null): string {
  return pct === null || pct >= 99.9 ? "var(--up)" : pct >= 99 ? "var(--slow)" : "var(--down)";
}

/** htop-style stat grid with segmented meters. */
export function Stats({ uptime, avgMs, rangeLabel, sslExpiresAt, checkSsl, now }: Props) {
  const windows: Array<[string, number | null]> = [
    ["uptime.24h", uptime.h24],
    ["uptime.7d", uptime.d7],
    ["uptime.30d", uptime.d30],
  ];
  const sslDays = checkSsl && sslExpiresAt ? daysUntil(sslExpiresAt, now) : null;
  return (
    <dl className="m-0 mb-4 grid grid-cols-2 gap-px border border-line-strong bg-line-strong lg:grid-cols-5">
      {windows.map(([label, pct]) => (
        <div key={label} className="bg-surface px-4 py-3">
          <dt className="text-xs text-fg-3">{label}</dt>
          <dd className={`m-0 mt-0.5 text-lg font-bold tracking-[-0.03em] ${uptimeTone(pct)}`}>{formatUptime(pct)}</dd>
          <Meter pct={pct ?? 0} tone={meterTone(pct)} />
        </div>
      ))}
      <div className="bg-surface px-4 py-3">
        <dt className="text-xs text-fg-3">resp.avg.{rangeLabel}</dt>
        <dd className="m-0 mt-0.5 text-lg font-bold tracking-[-0.03em]">
          {avgMs === null ? "—" : avgMs}
          <small className="ml-1 text-xs font-normal tracking-normal text-fg-3">ms</small>
        </dd>
        <Meter pct={avgMs === null ? 0 : (avgMs / 2000) * 100} tone="var(--text-3)" />
        <span className="mt-1 block text-xs text-fg-3">of a 2 s budget</span>
      </div>
      <div className="col-span-2 bg-surface px-4 py-3 lg:col-span-1">
        <dt className="text-xs text-fg-3">ssl.expires</dt>
        <dd className={`m-0 mt-0.5 text-lg font-bold tracking-[-0.03em] ${sslDays !== null && sslDays <= 14 ? "text-slow" : ""}`}>
          {sslDays === null ? (checkSsl ? "—" : "off") : sslDays}
          {sslDays !== null ? <small className="ml-1 text-xs font-normal tracking-normal text-fg-3">days</small> : null}
        </dd>
        <Meter pct={sslDays === null ? 0 : (sslDays / 90) * 100} tone={sslDays !== null && sslDays <= 14 ? "var(--slow)" : "var(--up)"} />
        <span className="mt-1 block text-xs text-fg-3">
          {sslExpiresAt && checkSsl ? `${sslExpiresAt.toISOString().slice(0, 10)}` : checkSsl ? "known after the first HTTPS check" : "SSL check is off"}
        </span>
      </div>
    </dl>
  );
}
