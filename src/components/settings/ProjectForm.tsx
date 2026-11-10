"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { updateProjectAction } from "@/app/actions/projects";
import { initialState } from "@/app/actions/types";
import { Field } from "@/components/monitor-form/Field";
import { toast } from "@/components/toast/store";
import { FormMessage } from "@/components/ui/FieldError";
import { SubmitButton } from "@/components/ui/SubmitButton";

type Project = { id: string; name: string; slug: string; note: string | null; monitorCount: number };

const NOTE_MAX = 280;

/** Status page settings for one project: name, public address and the owner note banner. */
export function ProjectForm({ project }: { project: Project }) {
  const [state, save] = useActionState(updateProjectAction, initialState);
  const [values, setValues] = useState({ name: project.name, slug: project.slug, note: project.note ?? "" });
  const seen = useRef(state);
  const e = state.errors ?? {};

  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (state.ok) toast("ok", state.message ?? "Saved", "The public page updates within a minute.");
  }, [state]);

  const savedSlug = state.ok ? (state.values?.slug ?? project.slug) : project.slug;
  return (
    <form action={save} className="grid gap-4 p-4">
      <input type="hidden" name="projectId" value={project.id} />
      <FormMessage message={state.message} ok={state.ok} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`name-${project.id}`} label="project name" error={e.name}>
          {(a) => <input {...a} name="name" maxLength={60} value={values.name} onChange={(ev) => setValues((v) => ({ ...v, name: ev.target.value }))} className="input" />}
        </Field>
        <Field id={`slug-${project.id}`} label="public address" error={e.slug} hint={`Lowercase letters, numbers and dashes. /status/${values.slug || "…"}`}>
          {(a) => (
            <input
              {...a}
              name="slug"
              maxLength={40}
              autoCapitalize="none"
              spellCheck={false}
              value={values.slug}
              onChange={(ev) => setValues((v) => ({ ...v, slug: ev.target.value.toLowerCase() }))}
              className="input"
            />
          )}
        </Field>
      </div>
      <Field id={`note-${project.id}`} label="owner note" optional error={e.note} hint={`Shown as a banner on the status page, e.g. "Planned maintenance Sat 22:00–23:00 IST". ${values.note.length}/${NOTE_MAX}`}>
        {(a) => <textarea {...a} name="note" rows={3} maxLength={NOTE_MAX} value={values.note} onChange={(ev) => setValues((v) => ({ ...v, note: ev.target.value }))} className="input prose-text" />}
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton variant="primary" pendingLabel="saving">
          save status page
        </SubmitButton>
        <Link href={`/status/${savedSlug}`} className="text-sm text-fg-2 hover:text-accent-ink">
          open /status/{savedSlug} →
        </Link>
        <span className="text-xs text-fg-3">{project.monitorCount} monitors</span>
      </div>
    </form>
  );
}
