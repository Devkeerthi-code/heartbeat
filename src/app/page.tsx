import Link from "next/link";
import { LandingTrace } from "@/components/landing/LandingTrace";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Brand } from "@/components/ui/Brand";
import { Prompt } from "@/components/ui/Prompt";
import { getCurrentUser } from "@/lib/auth/session";

const FACTS = [
  { key: "check.interval", value: "5 min", note: "Pick 10, 30 or 60 for quieter projects." },
  { key: "alert.after", value: "2 fails", note: "A single slow cold start won't wake you up." },
  { key: "ssl.warn", value: "14 days", note: "Before your certificate expires." },
  { key: "status.page", value: "public", note: "One link for your résumé, club group or shop counter." },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr_auto]">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 md:px-8 md:py-4">
        <Brand />
        <nav aria-label="Account" className="flex items-center gap-2">
          <ThemeToggle className="mr-1" />
          {user ? (
            <Link href="/dashboard" className="btn btn-primary btn-sm">
              open dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">
                sign in
              </Link>
              <Link href="/signup" className="btn btn-primary btn-sm">
                create account
              </Link>
            </>
          )}
        </nav>
      </header>

      <main id="main" className="mx-auto grid w-full max-w-[1200px] gap-12 px-4 py-8 md:px-8 md:py-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-16">
        <div className="min-w-0">
          <Prompt user="guest">curl -I https://your-portfolio.vercel.app</Prompt>
          <p className="prompt type-on type-on-2">
            <span className="text-down">HTTP/2 503</span> <span className="text-fg-3">· nobody noticed for 3 days</span>
          </p>
          <h1 className="my-4 max-w-[20ch] text-[28px]/[32px] tracking-[-0.04em] md:text-2xl md:tracking-[-0.05em]">
            Your site went down on Tuesday. <span className="text-fg-3">A recruiter told you on Friday.</span>
          </h1>
          <p className="prose-text mb-6 max-w-[56ch] text-prose text-fg-2 md:text-md">
            Heartbeat checks your Vercel, Render and Railway projects every 5 minutes, emails you after two failed checks in a row,
            and gives you a status page you can put on your résumé. Free, and built for student projects, college clubs and small
            shops.
          </p>
          <div className="mb-10 flex flex-wrap gap-2">
            <Link href={user ? "/monitors/new" : "/signup"} className="btn btn-primary">
              {user ? "+ add a monitor" : "start monitoring, free"}
            </Link>
            <Link href="/status/demo-coding-club" className="btn">
              see an example status page <span className="demo-badge">DEMO</span>
            </Link>
          </div>
          <LandingTrace />
        </div>

        <aside aria-labelledby="how-h" className="min-w-0 self-start lg:pt-10">
          <h2 id="how-h" className="pane-title mb-3">
            how it works
          </h2>
          <dl className="m-0 border-t border-line-strong">
            {FACTS.map((f) => (
              <div key={f.key} className="grid gap-1 border-b border-dashed border-line py-3 sm:grid-cols-[16ch_1fr] sm:gap-4">
                <dt className="text-fg-3">{f.key}</dt>
                <dd className="m-0">
                  <b className="font-bold text-accent-ink">{f.value}</b>
                  <span className="prose-text block text-sm/[22px] text-fg-2">{f.note}</span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="prose-text mt-4 text-sm/[22px] text-fg-3">
            Checks run from one region. A monitor is only marked down after two failures in a row, and you get one email when it
            breaks and one when it recovers.
          </p>
        </aside>
      </main>

      <footer className="flex flex-wrap justify-between gap-3 border-t border-line px-4 py-3 text-xs text-fg-3 md:px-8">
        <span>Built for students, college clubs and small shops whose sites live on free tiers.</span>
        <span>uptime checks · email + push alerts · public status pages</span>
      </footer>
    </div>
  );
}
