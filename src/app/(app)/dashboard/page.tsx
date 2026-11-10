import type { Metadata } from "next";
import Link from "next/link";
import { AutoRefresh } from "@/components/dashboard/AutoRefresh";
import { MonitorTable } from "@/components/dashboard/MonitorTable";
import { Onboarding } from "@/components/dashboard/Onboarding";
import { ProjectSwitcher } from "@/components/dashboard/ProjectSwitcher";
import { StatusLines } from "@/components/dashboard/StatusLines";
import { toRow } from "@/components/dashboard/toRows";
import { Vitals } from "@/components/dashboard/Vitals";
import { IncidentLog } from "@/components/monitor/IncidentLog";
import { FlashToast } from "@/components/toast/FlashToast";
import { Pane } from "@/components/ui/Pane";
import { Prompt } from "@/components/ui/Prompt";
import { requireUser } from "@/lib/auth/guard";
import { getDashboard } from "@/lib/queries";

export const metadata: Metadata = { title: "Monitors" };

type Search = Promise<Record<string, string | string[] | undefined>>;

function Flash({ params }: { params: Record<string, string | string[] | undefined> }) {
  if (params.welcome) return <FlashToast title="Account created" body="Add your first monitor below. It takes about 20 seconds." />;
  if (params.deleted) return <FlashToast title="Monitor deleted" body="Its checks and incidents were removed too." />;
  return null;
}

export default async function DashboardPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const user = await requireUser();
  const projectParam = typeof params.project === "string" ? params.project : undefined;
  const { projects, project, monitors, incidents } = await getDashboard(user.id, projectParam);
  const now = new Date();
  const rows = monitors.map((m) => toRow(m, now));
  const open = incidents.filter((i) => !i.resolvedAt).map((i) => ({ monitorId: i.monitor.id, startedAt: i.startedAt }));

  return (
    <>
      <Flash params={params} />
      <AutoRefresh />
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-full">
          <Prompt>heartbeat ls --project {project?.slug ?? "none"}</Prompt>
          <h1 className="m-0 text-[24px]/[28px] tracking-[-0.03em] md:text-xl">Monitors</h1>
          {project ? (
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-3">
              <span>{project.name}</span>
              <Link href={`/status/${project.slug}`} className="text-fg-2 hover:text-accent-ink">
                public status page →
              </Link>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {project ? <ProjectSwitcher projects={projects} currentId={project.id} /> : null}
          <Link href={project ? `/monitors/new?project=${project.id}` : "/monitors/new"} className="btn btn-primary">
            + add monitor <kbd className="max-md:hidden">n</kbd>
          </Link>
        </div>
      </div>

      {!project ? (
        <p className="pane p-4 text-fg-2">You don&apos;t have a project yet. Create one in settings.</p>
      ) : !rows.length ? (
        <Onboarding projectId={project.id} />
      ) : (
        <>
          <Vitals statuses={rows.map((r) => r.status)} />
          <StatusLines rows={rows} open={open} now={now} />
          <MonitorTable rows={rows} />
          <Pane title="recent incidents" titleId="incidents-h" className="mt-6" aside={<span className="text-xs text-fg-3">times in UTC</span>}>
            <IncidentLog incidents={incidents.map((i) => ({ ...i, monitor: i.monitor }))} now={now} empty="No incidents yet. Long may it last." />
          </Pane>
        </>
      )}
    </>
  );
}
