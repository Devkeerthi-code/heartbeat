import type { Metadata } from "next";
import Link from "next/link";
import { MonitorForm } from "@/components/monitor-form/MonitorForm";
import { Prompt } from "@/components/ui/Prompt";
import { requireUser } from "@/lib/auth/guard";
import { getProjectsForUser } from "@/lib/queries";

export const metadata: Metadata = { title: "Add a monitor" };

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function NewMonitorPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const user = await requireUser();
  const projects = await getProjectsForUser(user.id);
  const wanted = typeof params.project === "string" ? params.project : undefined;
  const project = projects.find((p) => p.id === wanted) ?? projects[0];
  const url = typeof params.url === "string" ? params.url.slice(0, 2048) : "";

  return (
    <>
      <Link href="/dashboard" className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-3 no-underline hover:text-fg">
        <span aria-hidden="true">&lt;-</span> monitors
      </Link>
      <div className="mb-4">
        <Prompt>heartbeat add{project ? ` --project ${project.slug}` : ""}</Prompt>
        <h1 className="m-0 text-[24px]/[28px] tracking-[-0.03em] md:text-xl">Add a monitor</h1>
        <p className="prose-text mt-1 text-prose text-fg-2">
          Paste a public URL. Everything else has a sensible default.
          {projects.length > 1 && project ? <span className="text-fg-3"> Adding to {project.name}.</span> : null}
        </p>
      </div>
      {project ? (
        <MonitorForm key={project.id} mode="create" projectId={project.id} initial={{ url }} />
      ) : (
        <p className="pane p-4 text-fg-2">
          You need a project first. <Link href="/settings">Create one in settings</Link>.
        </p>
      )}
    </>
  );
}
