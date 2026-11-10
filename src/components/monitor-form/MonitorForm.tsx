"use client";

import Link from "next/link";
import { startTransition, useActionState, useRef, useState } from "react";
import { createMonitorAction, testMonitorAction, updateMonitorAction, type TestResult } from "@/app/actions/monitors";
import { initialState } from "@/app/actions/types";
import { FormMessage } from "@/components/ui/FieldError";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { DryRun } from "./DryRun";
import { Field } from "./Field";
import { IntervalPicker } from "./IntervalPicker";
import { DEFAULT_VALUES, type MonitorFormValues } from "./types";
import { nameFromUrl, urlProblem } from "./urlCheck";

type Props =
  | { mode: "create"; projectId: string; initial?: Partial<MonitorFormValues> }
  | { mode: "edit"; monitorId: string; initial: MonitorFormValues };

const initialTest: TestResult = {};

export function MonitorForm(props: Props) {
  const [state, save] = useActionState(props.mode === "create" ? createMonitorAction : updateMonitorAction, initialState);
  const [test, runTest, testing] = useActionState(testMonitorAction, initialTest);
  const [values, setValues] = useState<MonitorFormValues>({ ...DEFAULT_VALUES, ...props.initial });
  const [source, setSource] = useState<"save" | "test">("save");
  const [edited, setEdited] = useState<Set<string>>(new Set());
  const [urlHint, setUrlHint] = useState<string | null>(null);
  const [testedAt, setTestedAt] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const serverErrors = (source === "save" ? state.errors : test.errors) ?? {};
  const errorFor = (field: string) => (field === "url" && urlHint) || (edited.has(field) ? undefined : serverErrors[field]);

  const set = <K extends keyof MonitorFormValues>(key: K, value: MonitorFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setEdited((e) => new Set(e).add(key));
    if (key === "url" && urlHint) setUrlHint(urlProblem(String(value)));
  };

  const onUrlBlur = () => {
    if (!values.url.trim()) return;
    setUrlHint(urlProblem(values.url));
    if (!values.name.trim()) setValues((v) => ({ ...v, name: nameFromUrl(v.url) }));
  };

  const onTest = () => {
    const form = formRef.current;
    if (!form) return;
    setSource("test");
    setEdited(new Set());
    setTestedAt(Date.now());
    startTransition(() => runTest(new FormData(form)));
  };

  return (
    <form
      ref={formRef}
      action={save}
      noValidate
      onSubmit={() => {
        setSource("save");
        setEdited(new Set());
      }}
      className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]"
    >
      {props.mode === "create" ? <input type="hidden" name="projectId" value={props.projectId} /> : <input type="hidden" name="monitorId" value={props.monitorId} />}

      <div className="pane">
        <fieldset className="m-0 grid min-w-0 gap-4 border-0 border-b border-line p-4">
          <legend className="float-left mb-3 w-full p-0 text-xs font-semibold tracking-[0.08em] text-fg-3 uppercase">
            <span className="text-accent-ink">## </span>what to check
          </legend>
          <FormMessage message={source === "save" ? state.message : undefined} ok={state.ok} />
          <Field id="url" label="url" error={errorFor("url")} hint="The public address, e.g. https://your-app.vercel.app or an /api/health route.">
            {(a) => <input {...a} name="url" type="url" inputMode="url" autoComplete="url" required placeholder="https://your-project.vercel.app" value={values.url} onChange={(e) => set("url", e.target.value)} onBlur={onUrlBlur} className="input" />}
          </Field>
          <Field id="name" label="name" error={errorFor("name")} hint="Shown on your dashboard, in alerts and on the public status page.">
            {(a) => <input {...a} name="name" type="text" maxLength={60} required placeholder="filled from the url" value={values.name} onChange={(e) => set("name", e.target.value)} className="input" />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-[120px_1fr_1fr]">
            <Field id="method" label="method" error={errorFor("method")}>
              {(a) => (
                <select {...a} name="method" value={values.method} onChange={(e) => set("method", e.target.value as MonitorFormValues["method"])} className="input">
                  <option>GET</option>
                  <option>HEAD</option>
                  <option>POST</option>
                </select>
              )}
            </Field>
            <Field id="expectedStatus" label="expected status" error={errorFor("expectedStatus")}>
              {(a) => <input {...a} name="expectedStatus" inputMode="numeric" maxLength={3} value={values.expectedStatus} onChange={(e) => set("expectedStatus", e.target.value)} className="input" />}
            </Field>
            <Field id="keyword" label="keyword" optional error={errorFor("keyword")} hint="Fails if the response body doesn't contain it.">
              {(a) => <input {...a} name="keyword" maxLength={200} placeholder='e.g. "ok"' value={values.keyword} onChange={(e) => set("keyword", e.target.value)} className="input" />}
            </Field>
          </div>
        </fieldset>

        <fieldset className="m-0 grid min-w-0 gap-4 border-0 border-b border-line p-4">
          <legend className="float-left mb-3 w-full p-0 text-xs font-semibold tracking-[0.08em] text-fg-3 uppercase">
            <span className="text-accent-ink">## </span>how often
          </legend>
          <IntervalPicker value={values.intervalMinutes} onChange={(v) => set("intervalMinutes", v)} error={errorFor("intervalMinutes")} />
          <Field id="timeoutSeconds" label="timeout" error={errorFor("timeoutSeconds")} className="max-w-[220px]">
            {(a) => (
              <div className="relative flex items-center">
                <input {...a} name="timeoutSeconds" inputMode="numeric" maxLength={2} value={values.timeoutSeconds} onChange={(e) => set("timeoutSeconds", e.target.value)} className="input pr-20" />
                <span aria-hidden="true" className="pointer-events-none absolute right-3 text-sm text-fg-3">
                  seconds
                </span>
              </div>
            )}
          </Field>
        </fieldset>

        <fieldset className="m-0 min-w-0 border-0 p-4">
          <legend className="float-left mb-3 w-full p-0 text-xs font-semibold tracking-[0.08em] text-fg-3 uppercase">
            <span className="text-accent-ink">## </span>extras
          </legend>
          <label className="clear-both flex cursor-pointer items-start gap-3">
            <input type="checkbox" name="checkSsl" checked={values.checkSsl} onChange={(e) => set("checkSsl", e.target.checked)} className="check" />
            <span>
              <strong className="block font-semibold">Warn me before the SSL certificate expires</strong>
              <span className="prose-text text-sm text-fg-3">Email 14 days before expiry. HTTPS URLs only.</span>
            </span>
          </label>
        </fieldset>

        <div className="flex flex-wrap justify-between gap-3 border-t border-line-strong bg-surface-2 px-4 py-3">
          <Link href={props.mode === "edit" ? `/monitors/${props.monitorId}` : "/dashboard"} className="btn btn-ghost">
            cancel
          </Link>
          <div className="ml-auto flex flex-wrap gap-2">
            <button type="button" onClick={onTest} disabled={testing} aria-busy={testing} className="btn">
              {testing ? (
                <>
                  <span className="spinner" aria-hidden="true" /> testing
                </>
              ) : (
                "test now"
              )}
            </button>
            <SubmitButton variant="primary" pendingLabel="saving">
              {props.mode === "edit" ? "save changes" : "save monitor"}
            </SubmitButton>
          </div>
        </div>
      </div>

      <div>
        <DryRun values={values} result={test} pending={testing} testedAt={testedAt} />
      </div>
    </form>
  );
}
