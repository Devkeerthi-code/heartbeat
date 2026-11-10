import { dayLabel } from "@/components/format";
import { StatusTag } from "@/components/monitor/StatusTag";
import { formatDuration } from "@/lib/format";

type Incident = { id: string; startedAt: Date; resolvedAt: Date | null; durationSec: number | null; monitor: { name: string } };

function groupByDay(incidents: Incident[]): Array<{ day: string; items: Incident[] }> {
  const groups = new Map<string, Incident[]>();
  for (const i of incidents) {
    const key = i.startedAt.toISOString().slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), i]);
  }
  return [...groups].map(([day, items]) => ({ day, items }));
}

/** Public incident history, grouped by UTC day. No error strings or URLs are shown publicly. */
export function PastIncidents({ incidents, now }: { incidents: Incident[]; now: Date }) {
  if (!incidents.length) {
    return <p className="border-t border-dashed border-line-strong py-3 text-sm text-fg-3">No incidents in the last 90 days.</p>;
  }
  return (
    <div>
      {groupByDay(incidents).map((g) => (
        <div key={g.day} className="grid gap-1 border-t border-dashed border-line-strong py-3 sm:grid-cols-[120px_1fr] sm:gap-4">
          <time dateTime={g.day} className="text-sm text-fg-2">
            {dayLabel(new Date(g.day))}
          </time>
          <div className="grid gap-3">
            {g.items.map((i) => {
              const open = !i.resolvedAt;
              const seconds = i.durationSec ?? (now.getTime() - i.startedAt.getTime()) / 1000;
              return (
                <article key={i.id}>
                  <h3 className="m-0 flex flex-wrap items-center gap-2 text-base font-semibold">
                    {open ? <StatusTag status="down" /> : <span className="tag tag-paused">[DONE]</span>}
                    {i.monitor.name} {open ? "is down" : "was unavailable"}
                  </h3>
                  <p className="m-0 mt-0.5 text-xs text-fg-3">
                    {open ? "Ongoing" : "Resolved"} · started {i.startedAt.toISOString().slice(11, 16)} UTC · {open ? `${formatDuration(seconds)} so far` : `lasted ${formatDuration(seconds)}`}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
