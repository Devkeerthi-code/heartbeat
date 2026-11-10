import Link from "next/link";
import { logStamp } from "@/components/format";
import { StatusTag } from "@/components/monitor/StatusTag";
import { formatDuration } from "@/lib/format";
import type { MonitorRow } from "./types";

type OpenIncident = { monitorId: string; startedAt: Date };

/** Typed-on status lines under the trace: what is broken right now, in one sentence each. */
export function StatusLines({ rows, open, now }: { rows: MonitorRow[]; open: OpenIncident[]; now: Date }) {
  const down = rows.filter((r) => r.status === "down");
  const slow = rows.filter((r) => r.status === "slow");
  return (
    <ul aria-live="polite" className="mt-3 mb-4 grid list-none gap-0.5 p-0 text-fg-2">
      {down.map((r) => {
        const since = open.find((o) => o.monitorId === r.id)?.startedAt;
        return (
          <li key={r.id} className="type-on flex flex-wrap items-baseline gap-x-2">
            {since ? <span className="text-fg-3">{logStamp(since).slice(6)}</span> : null}
            <StatusTag status="down" />
            <Link href={`/monitors/${r.id}`} className="font-semibold text-fg hover:text-accent-ink">
              {r.name}
            </Link>
            <span>
              {since ? `down for ${formatDuration((now.getTime() - since.getTime()) / 1000)}` : "down"} · {r.lastSub}
            </span>
          </li>
        );
      })}
      {slow.map((r) => (
        <li key={r.id} className="type-on type-on-2 flex flex-wrap items-baseline gap-x-2">
          <StatusTag status="slow" />
          <Link href={`/monitors/${r.id}`} className="font-semibold text-fg hover:text-accent-ink">
            {r.name}
          </Link>
          <span>responding slowly: {r.last}</span>
        </li>
      ))}
      {!down.length && !slow.length ? (
        <li className="type-on flex flex-wrap items-baseline gap-x-2">
          <StatusTag status="up" />
          <strong className="font-semibold text-fg">All monitors are up.</strong>
        </li>
      ) : null}
    </ul>
  );
}
