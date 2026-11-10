import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { EcgTrace } from "@/components/ecg/EcgTrace";
import { StatusTag } from "@/components/monitor/StatusTag";
import { beatFor, type UiStatus } from "@/components/monitor/status";
import { UptimeBars } from "@/components/monitor/UptimeBars";
import { PastIncidents } from "@/components/status-page/PastIncidents";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { BrandMark } from "@/components/ui/Brand";
import { formatUtc } from "@/lib/format";
import { formatUptime } from "@/lib/monitoring/uptime";
import { getStatusPage } from "@/lib/queries";
import { track } from "@/lib/usage";

type Props = { params: Promise<{ slug: string }> };

const loadStatus = cache((slug: string) => getStatusPage(slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadStatus(slug);
  if (!page) return { title: "Status page not found" };
  return { title: `${page.project.name} status`, description: `Live uptime and incident history for ${page.project.name}.` };
}

function publicStatus(m: { status: "PENDING" | "UP" | "DOWN"; paused: boolean }): UiStatus {
  if (m.paused) return "paused";
  return m.status === "DOWN" ? "down" : m.status === "UP" ? "up" : "pending";
}

function headline(down: number, active: number): string {
  if (!active) return "No services are being monitored yet";
  if (!down) return "All systems operational";
  return down === active ? "All services are down" : `${down} of ${active} services ${down === 1 ? "is" : "are"} down`;
}

export default async function StatusPage({ params }: Props) {
  await connection();
  const { slug } = await params;
  const page = await loadStatus(slug);
  if (!page) notFound();
  track("status_page_view");

  const { project, monitors, incidents, generatedAt } = page;
  const statuses = monitors.map(publicStatus);
  const active = statuses.filter((s) => s !== "paused").length;
  const down = statuses.filter((s) => s === "down").length;
  const initials = project.name.slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-[860px] px-4 pt-5 pb-16 md:px-6 md:pt-8">
      <header className="perforated mb-6 flex items-center gap-3 md:mb-8">
        <span aria-hidden="true" className="grid size-9 flex-none place-items-center border border-accent-ink font-bold text-accent-ink">
          {initials}
        </span>
        <div className="min-w-0">
          <strong className="block truncate text-md">{project.name}</strong>
          <small className="text-xs text-fg-3">status page · times in UTC</small>
        </div>
        <ThemeToggle className="ml-auto self-start" />
      </header>

      <main id="main">
        {project.note ? (
          <aside aria-label="Note from the owner" className="mb-6 flex flex-wrap items-start gap-3 border border-slow bg-[var(--slow-soft)] px-4 py-3">
            <span className="tag tag-solid bg-slow">NOTICE</span>
            <div className="min-w-0 flex-1">
              <p className="prose-text m-0 text-prose">{project.note}</p>
              {project.noteUpdatedAt ? <p className="m-0 mt-1 text-xs text-fg-3">posted {formatUtc(project.noteUpdatedAt)}</p> : null}
            </div>
          </aside>
        ) : null}

        <section aria-labelledby="now-h" className="mb-5">
          <p className="prompt type-on">
            <span className="ps1" aria-hidden="true">
              $
            </span>
            status --now
          </p>
          <h1 id="now-h" className="my-2 flex flex-wrap items-center gap-3 text-[26px]/[30px] tracking-[-0.04em] md:text-[36px]/[40px]">
            <StatusTag status={down ? "down" : active ? "up" : "pending"} className="stamp text-sm" />
            {headline(down, active)}
          </h1>
          <div className="vitals crt mt-4">
            <EcgTrace beats={statuses.map(beatFor)} height={72} />
          </div>
        </section>

        {monitors.length ? (
          <section aria-label="Services" className="pane">
            {monitors.map((m, i) => (
              <div key={m.id} className="border-b border-line p-3 last:border-b-0 md:p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="m-0 flex items-center gap-2 text-base font-semibold">
                    {m.name} <StatusTag status={statuses[i] ?? "pending"} />
                  </h2>
                  <span className="text-sm text-fg-2">
                    {formatUptime(m.uptime90)} <span className="prose-text text-fg-3">uptime, 90 days</span>
                  </span>
                </div>
                <UptimeBars bars={m.bars.map((b) => ({ ...b, day: b.day.toISOString() }))} label={`${m.name}: daily uptime for the last 90 days`} />
              </div>
            ))}
          </section>
        ) : null}

        <div aria-label="Legend" className="mt-3 mb-8 flex flex-wrap gap-4 text-xs text-fg-3">
          <span className="inline-flex items-center gap-1.5">
            <i className="bar inline-block h-3.5 w-2 flex-none" /> no downtime
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="bar bar-slow inline-block h-3.5 w-2 flex-none" /> some failed checks
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="bar bar-down inline-block h-3.5 w-2 flex-none" /> mostly down
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="bar bar-none inline-block h-3.5 w-2 flex-none" /> not monitored
          </span>
        </div>

        <section aria-labelledby="past-h">
          <h2 id="past-h" className="pane-title mb-2">
            past incidents
          </h2>
          <PastIncidents incidents={incidents} now={generatedAt} />
        </section>
      </main>

      <footer className="mt-8 flex flex-wrap justify-between gap-3 border-t border-line-strong pt-3 text-xs text-fg-3">
        <span>Checked every 5–60 min from 1 region · updated {formatUtc(generatedAt)}</span>
        <Link href="/" className="inline-flex items-center gap-1.5 text-fg-3 no-underline hover:text-accent-ink">
          <BrandMark className="size-3.5" /> monitored with heartbeat
        </Link>
      </footer>
    </div>
  );
}
