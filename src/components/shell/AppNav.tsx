"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { Brand } from "@/components/ui/Brand";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { CronCountdown } from "./CronCountdown";

const LINKS = [
  { href: "/dashboard", label: "monitors", key: "g m", tab: "ls", match: (p: string) => p === "/dashboard" || (p.startsWith("/monitors/") && p !== "/monitors/new") },
  { href: "/monitors/new", label: "add monitor", key: "n", tab: "+", match: (p: string) => p === "/monitors/new" },
  { href: "/settings", label: "settings", key: "g a", tab: "!", match: (p: string) => p === "/settings" },
];

type Props = { email: string; downCount: number };

export function AppNav({ email, downCount }: Props) {
  const pathname = usePathname();
  return (
    <>
      <aside aria-label="Sidebar" className="sticky top-0 hidden h-dvh flex-col gap-4 border-r border-line bg-surface py-4 md:flex">
        <div className="px-4">
          <Brand href="/dashboard" cursor />
        </div>
        <nav aria-label="Main" className="grid">
          {LINKS.map((l) => {
            const active = l.match(pathname);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className="flex items-center gap-3 border-l-2 border-transparent px-4 py-1.5 text-fg-2 no-underline transition-colors duration-[120ms] hover:bg-surface-2 hover:text-fg aria-[current=page]:border-accent-ink aria-[current=page]:bg-[var(--accent-soft)] aria-[current=page]:text-fg"
              >
                <span aria-hidden="true" className="w-7 text-xs text-fg-3">
                  {l.key}
                </span>
                {l.label}
                {l.href === "/dashboard" && downCount > 0 ? (
                  <span className="ml-auto bg-down px-1 text-xs text-bg">{downCount} down</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto grid gap-0.5 border-t border-dashed border-line px-4 pt-3 text-xs text-fg-3">
          <span>
            cron <span className="text-fg-2">*/5 * * * *</span>
          </span>
          <span>
            next run in <CronCountdown className="text-fg-2" />
          </span>
          <span className="truncate" title={email}>
            {email}
          </span>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 whitespace-nowrap">
            <form action={logoutAction}>
              <SubmitButton size="sm" variant="ghost" pendingLabel="signing out" className="-ml-2">
                sign out
              </SubmitButton>
            </form>
            <button type="button" className="cursor-pointer text-fg-3 hover:text-fg" onClick={() => window.dispatchEvent(new Event("hb:help"))}>
              [?] keys
            </button>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-line bg-bg px-4 py-2 md:hidden">
        <Brand href="/dashboard" />
        <ThemeToggle className="ml-auto" />
        <form action={logoutAction}>
          <SubmitButton size="sm" variant="ghost" pendingLabel="…">
            sign out
          </SubmitButton>
        </form>
      </header>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line-strong bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {LINKS.map((l) => {
          const active = l.match(pathname);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className="grid justify-items-center border-t-2 border-transparent py-2 text-xs text-fg-3 no-underline aria-[current=page]:border-accent-ink aria-[current=page]:bg-[var(--accent-soft)] aria-[current=page]:text-fg"
            >
              <b aria-hidden="true" className={`text-md ${active ? "text-accent-ink" : ""}`}>
                {l.tab}
              </b>
              {l.label === "add monitor" ? "add" : l.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
