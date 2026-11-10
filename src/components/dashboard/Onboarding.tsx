import Link from "next/link";
import { EcgTrace } from "@/components/ecg/EcgTrace";

const STEPS = [
  { title: "paste a public url", body: "Vercel, Render, Railway, Netlify or your own domain." },
  { title: "we check it every 5 min", body: "Status code, an optional keyword, and the SSL certificate." },
  { title: "2 misses in a row → email", body: "And another when it's back, with how long it was down." },
];

/** Empty state: no monitors in this project yet. */
export function Onboarding({ projectId }: { projectId: string }) {
  return (
    <section aria-labelledby="empty-h" className="pane grid gap-6 p-4 md:grid-cols-[1.1fr_1fr] md:p-6">
      <div>
        <p className="prompt">
          <span className="ps1" aria-hidden="true">
            $
          </span>
          heartbeat ls → 0 monitors
        </p>
        <h2 id="empty-h" className="mt-2 mb-3 text-xl tracking-[-0.03em]">
          Nothing is being watched yet.
        </h2>
        <p className="prose-text mb-4 max-w-[48ch] text-prose text-fg-2">
          Add the URL you&apos;d least like to see down: your portfolio, your club&apos;s site, the shop&apos;s order page. The first
          check runs as soon as you save.
        </p>
        <form action="/monitors/new" method="get" className="flex flex-col sm:flex-row">
          <input type="hidden" name="project" value={projectId} />
          <label htmlFor="quick-url" className="sr-only">
            URL to monitor
          </label>
          <input id="quick-url" name="url" type="url" inputMode="url" placeholder="https://your-project.vercel.app" className="input sm:border-r-0" />
          <button type="submit" className="btn btn-primary h-9">
            start monitoring
          </button>
        </form>
        <p className="mt-3 text-xs text-fg-3">
          or <Link href={`/monitors/new?project=${projectId}`} className="text-fg-2 hover:text-accent-ink">open the full form</Link>
        </p>
      </div>
      <ol className="m-0 list-none border border-line p-0">
        {STEPS.map((s, i) => (
          <li key={s.title} className="grid grid-cols-[32px_1fr] gap-2 border-t border-dashed border-line p-3 first:border-t-0">
            <span aria-hidden="true" className="text-accent-ink">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <strong className="block font-semibold">{s.title}</strong>
              <span className="prose-text text-sm text-fg-3">{s.body}</span>
            </div>
          </li>
        ))}
      </ol>
      <div className="vitals crt md:col-span-2">
        <span className="absolute top-2 left-3 z-[1] text-xs tracking-[0.06em] text-fg-3 uppercase">no signal · waiting for your first monitor</span>
        <EcgTrace beats={["idle"]} height={96} />
      </div>
    </section>
  );
}
