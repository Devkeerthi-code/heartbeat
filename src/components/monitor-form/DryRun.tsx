import type { TestResult } from "@/app/actions/monitors";
import type { MonitorFormValues } from "./types";

type Props = { values: MonitorFormValues; result: TestResult; pending: boolean; testedAt: number };

function daysLeft(iso: string, testedAt: number): number {
  return Math.ceil((new Date(iso).getTime() - testedAt) / 86_400_000);
}

/** Live plain-English summary of the monitor plus a real one-off check (testMonitorAction). */
export function DryRun({ values, result, pending, testedAt }: Props) {
  const url = values.url.trim() || "https://your-project.vercel.app";
  const interval = Number(values.intervalMinutes);
  const ran = result.ok !== undefined || result.message !== undefined;

  return (
    <aside aria-labelledby="dry-h" className="pane self-start lg:sticky lg:top-6">
      <div className="pane-head">
        <h2 id="dry-h" className="pane-title">
          dry run
        </h2>
        <span className="text-xs text-fg-3">nothing is saved</span>
      </div>
      <div className="grid gap-4 p-4">
        <p className="prose-text m-0 text-prose text-fg-2">
          Every <b className="bg-surface-3 px-1 font-mono text-sm font-medium text-fg">{interval} min</b>, send{" "}
          <b className="bg-surface-3 px-1 font-mono text-sm font-medium text-fg">{values.method}</b> to{" "}
          <b className="bg-surface-3 px-1 font-mono text-sm font-medium break-all text-fg">{url}</b> and expect{" "}
          <b className="bg-surface-3 px-1 font-mono text-sm font-medium text-fg">{values.expectedStatus || "200"}</b>
          {values.keyword.trim() ? (
            <>
              {" "}
              with <b className="bg-surface-3 px-1 font-mono text-sm font-medium text-fg">&quot;{values.keyword.trim()}&quot;</b> in the body
            </>
          ) : null}{" "}
          within <b className="bg-surface-3 px-1 font-mono text-sm font-medium text-fg">{values.timeoutSeconds || "10"}s</b>.
          {values.checkSsl && url.startsWith("https://") ? " Also watch the SSL certificate." : ""}
        </p>
        <div>
          <span className="block text-xs text-fg-3">marked down after</span>
          <div aria-hidden="true" className="my-1 flex items-center gap-0.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-4 bg-up" />
            ))}
            {[0, 1].map((i) => (
              <span key={`f${i}`} className="size-4 bg-[repeating-linear-gradient(45deg,var(--down)_0_2px,transparent_2px_4px)] shadow-[inset_0_0_0_1px_var(--down)]" />
            ))}
            <span className="tag tag-solid ml-1.5 bg-down">DOWN</span>
          </div>
          <span className="block text-xs text-fg-3">Two failed checks in a row, about {interval * 2} min after it breaks.</span>
        </div>
        <output aria-live="polite" className="grid min-h-[72px] content-start gap-0.5 border border-line bg-bg p-3 text-xs text-fg-2">
          {pending ? (
            <>
              <span className="break-all">
                $ {values.method} {url}
              </span>
              <span>
                connecting
                <span className="cursor" aria-hidden="true" />
              </span>
            </>
          ) : ran ? (
            <>
              <span className="break-all">
                $ {values.method} {url}
              </span>
              {result.statusCode ? (
                <span className={result.ok ? "text-up" : "text-down"}>
                  &lt; {result.statusCode} · {result.responseMs ?? "?"}ms
                </span>
              ) : null}
              {result.sslExpiresAt ? <span className="text-up">&lt; tls valid · {daysLeft(result.sslExpiresAt, testedAt)} days left</span> : null}
              <span className={result.ok ? "text-up" : "text-down"}>
                {result.ok ? "[ OK ]" : "[FAIL]"} {result.message ?? (result.errors ? "Fix the highlighted fields first." : "")}
              </span>
            </>
          ) : (
            <span>
              $ press &quot;test now&quot; to run one real check without saving
              <span className="cursor" aria-hidden="true" />
            </span>
          )}
        </output>
      </div>
    </aside>
  );
}
