import Link from "next/link";
import { logStamp } from "@/components/format";
import { formatDuration } from "@/lib/format";

export type IncidentEntry = {
  id: string;
  startedAt: Date;
  resolvedAt: Date | null;
  durationSec: number | null;
  cause: string;
  monitor?: { id: string; name: string };
};

/** Incidents as a log stream: timestamp (UTC) · level · message · duration. */
export function IncidentLog({ incidents, now, empty }: { incidents: IncidentEntry[]; now: Date; empty: string }) {
  if (!incidents.length) return <p className="m-0 px-4 py-5 text-sm text-fg-3">{empty}</p>;
  return (
    <ol className="m-0 list-none py-2 pl-0">
      {incidents.map((i) => {
        const open = !i.resolvedAt;
        const seconds = i.durationSec ?? Math.round((now.getTime() - i.startedAt.getTime()) / 1000);
        return (
          <li key={i.id} className="log-row max-md:grid-cols-[auto_1fr] max-md:[grid-template-areas:'ts_lv'_'msg_msg'_'dur_dur']">
            <time dateTime={i.startedAt.toISOString()} className="whitespace-nowrap text-fg-3 max-md:[grid-area:ts]">
              {logStamp(i.startedAt)}
            </time>
            <span className={`font-bold max-md:[grid-area:lv] ${open ? "text-down" : "text-up"}`}>{open ? "OPEN" : "RSLVD"}</span>
            <span className="min-w-0 max-md:[grid-area:msg]">
              {i.monitor ? (
                <Link href={`/monitors/${i.monitor.id}`} className="font-semibold hover:text-accent-ink">
                  {i.monitor.name}
                </Link>
              ) : null}
              <small className="prose-text block text-xs text-fg-3">{i.cause}</small>
            </span>
            <span className="whitespace-nowrap text-right text-fg-2 max-md:text-left max-md:text-fg-3 max-md:[grid-area:dur]">
              {open ? `${formatDuration(seconds)} so far` : formatDuration(seconds)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
