import type { Metadata } from "next";
import { createProjectAction } from "@/app/actions/projects";
import { AlertPrefsForm } from "@/components/settings/AlertPrefsForm";
import { ProjectForm } from "@/components/settings/ProjectForm";
import { PushToggle } from "@/components/settings/PushToggle";
import { FlashToast } from "@/components/toast/FlashToast";
import { Pane } from "@/components/ui/Pane";
import { Prompt } from "@/components/ui/Prompt";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireUser } from "@/lib/auth/guard";
import { getProjectsForUser } from "@/lib/queries";

export const metadata: Metadata = { title: "Alerts and status page" };

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function SettingsPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const user = await requireUser();
  const projects = await getProjectsForUser(user.id);

  return (
    <>
      {params.error === "project-limit" ? <FlashToast kind="error" title="Project limit reached" body="You can have up to 5 projects. Rename or reuse one instead." /> : null}
      <div className="mb-4">
        <Prompt>heartbeat config --edit</Prompt>
        <h1 className="m-0 text-[24px]/[28px] tracking-[-0.03em] md:text-xl">Alerts and status page</h1>
        <p className="prose-text mt-1 text-prose text-fg-2">Where we tell you when something breaks, and what the public sees.</p>
      </div>

      <div className="grid max-w-[820px] gap-5">
        <Pane title="alert channels" titleId="alerts-h">
          <AlertPrefsForm email={user.email} emailAlerts={user.emailAlerts} pushAlerts={user.pushAlerts} />
        </Pane>

        <Pane title="push on this device" titleId="push-h">
          <PushToggle />
        </Pane>

        {projects.map((p) => (
          <Pane key={p.id} title={`status page · ${p.name}`} titleId={`project-${p.id}`}>
            <ProjectForm project={{ id: p.id, name: p.name, slug: p.slug, note: p.note, monitorCount: p._count.monitors }} />
          </Pane>
        ))}

        <Pane title="new project" titleId="new-project-h">
          <form action={createProjectAction} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="field">
              <label htmlFor="new-project" className="field-label">
                name
              </label>
              <input id="new-project" name="name" maxLength={60} required placeholder="e.g. Robotics club" className="input" aria-describedby="new-project-hint" />
              <span id="new-project-hint" className="field-hint">
                Each project gets its own monitors and its own public status page. Up to 5.
              </span>
            </div>
            <SubmitButton pendingLabel="creating" className="sm:mb-[22px]">
              + create project
            </SubmitButton>
          </form>
        </Pane>
      </div>
    </>
  );
}
