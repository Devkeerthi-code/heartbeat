import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { timeAgo } from "@/components/format";
import { IncidentLog } from "@/components/monitor/IncidentLog";
import { LiveClock } from "@/components/monitor/LiveClock";
import { MonitorActions } from "@/components/monitor/MonitorActions";
import { ResponseChart } from "@/components/monitor/ResponseChart";
import { Stats } from "@/components/monitor/Stats";
import { StatusTag } from "@/components/monitor/StatusTag";
import { uiStatus } from "@/components/monitor/status";
import { UptimeBars } from "@/components/monitor/UptimeBars";
import { AutoRefresh } from "@/components/dashboard/AutoRefresh";
import { FlashToast } from "@/components/toast/FlashToast";
import { Pane } from "@/components/ui/Pane";
import { Prompt } from "@/components/ui/Prompt";
import { requireUser } from "@/lib/auth/guard";
import { getMonitorDetail, type ChartRange } from "@/lib/queries";

export const metadata: Metadata = { title: "Monitor" };

const RANGES: ChartRange[] = ["24h", "7d", "30d"];

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function MonitorPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const range = RANGES.find((r) => r === sp.range) ?? "24h";
  const user = await requireUser();
  const detail = await getMonitorDetail(user.id, id, range);
  if (!detail) notFound();
  const { monitor: m, series, uptime, incidents, bars } = detail;
  const now = new Date();
  const status = uiStatus({ ...m, spark: series.slice(-36) });
  const open = incidents.find((i) => !i.resolvedAt);
  const okMs = series.flatMap((p) => (p.ok && p.ms !== null ? [p.ms] : []));
  const avgMs = okMs.length ? Math.round(okMs.reduce((a, b) => a + b, 0) / okMs.length) : null;

  return (
    <>
      {sp.created ? <FlashToast title="Monitor added" body="The first check runs within 5 minutes. We'll email you if it fails twice in a row." /> : null}
      {sp.saved ? <FlashToast title="Changes saved" body="They apply from the next check." /> : null}
      <AutoRefresh />
      <Link href={`/dashboard?project=${m.projectId}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-3 no-underline hover:text-fg">
        <span aria-hidden="true">&lt;-</span> monitors <kbd className="max-md:hidden">esc</kbd>
      </Link>
      <Prompt>heartbeat inspect {m.id.slice(-6)}</Prompt>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-full">
          <h1 className="m-0 flex flex-wrap items-center gap-3 text-[24px]/[28px] tracking-[-0.03em] md:text-xl">
            <span className="break-words">{m.name}</span>
            <StatusTag status={status} className="stamp" />
          </h1>
          <a href={m.url} target="_blank" rel="noreferrer" className="mt-1 block text-sm break-all text-fg-2 hover:text-accent-ink">
            {m.url} <span aria-hidden="true">↗</span>
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <dl className="m-0 mt-3 flex max-w-full flex-wrap border border-line text-xs">
            {[
              ["method", m.method],
              ["expect", String(m.expectedStatus)],
              ["body", m.keyword ? `"${m.keyword}"` : "any"],
              ["every", `${m.intervalMinutes}m`],
              ["timeout", `${Math.round(m.timeoutMs / 1000)}s`],
              ["last check", timeAgo(m.lastCheckedAt, now)],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-1.5 border-r border-line px-2 py-0.5 last:border-r-0">
                <dt className="text-fg-3">{k}</dt>
                <dd className="m-0">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <MonitorActions monitorId={m.id} paused={m.paused} />
      </div>

      {m.paused ? (
        <p role="status" className="mb-4 border border-line-strong bg-surface-2 px-4 py-3 text-sm text-fg-2">
          <span className="tag tag-paused mr-2">[PAUS]</span>Paused. No checks or alerts until you resume. Paused time doesn&apos;t count against uptime.
        </p>
      ) : open ? (
        <div role="status" className="mb-4 grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border border-down bg-[var(--down-soft)] px-4 py-3 md:grid-cols-[auto_1fr_auto]">
          <span className="tag tag-solid justify-self-start bg-down max-md:col-span-2">INCIDENT OPEN</span>
          <div className="min-w-0">
            <strong className="font-semibold">Down since {open.startedAt.toISOString().slice(11, 16)} UTC</strong>
            <p className="prose-text m-0 mt-0.5 text-sm text-fg-2">
              {open.cause}
              {m.consecutiveFailures > 1 ? ` · ${m.consecutiveFailures} failed checks in a row` : ""}
            </p>
          </div>
          <LiveClock since={open.startedAt.toISOString()} initialSec={(now.getTime() - open.startedAt.getTime()) / 1000} className="text-lg font-bold tracking-[-0.03em] text-down md:text-xl" />
        </div>
      ) : null}

      <Stats uptime={uptime} avgMs={avgMs} rangeLabel={range} sslExpiresAt={m.sslExpiresAt} checkSsl={m.checkSsl} now={now} />

      <Pane
        title="response time"
        titleId="chart-h"
        className="mb-4"
        aside={
          <nav aria-label="Chart range" className="seg">
            {RANGES.map((r) => (
              <Link key={r} href={`/monitors/${m.id}?range=${r}`} scroll={false} aria-current={r === range ? "page" : undefined}>
                {r}
              </Link>
            ))}
          </nav>
        }
      >
        <ResponseChart series={series} rangeLabel={range} />
      </Pane>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <Pane title="incidents" titleId="inc-h" aside={<span className="text-xs text-fg-3">UTC · last 50</span>}>
          <IncidentLog incidents={incidents} now={now} empty="No incidents. This monitor has never been down." />
        </Pane>
        <Pane title="90 days" titleId="days-h" aside={<span className="text-xs text-fg-3">one bar per UTC day</span>}>
          <div className="px-4 pb-4">
            <UptimeBars bars={bars.map((b) => ({ ...b, day: b.day.toISOString() }))} label={`${m.name}: daily uptime for the last 90 days`} />
          </div>
        </Pane>
      </div>
    </>
  );
}
