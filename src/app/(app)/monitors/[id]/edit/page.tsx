import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteMonitor } from "@/components/monitor/DeleteMonitor";
import { MonitorForm } from "@/components/monitor-form/MonitorForm";
import type { MonitorFormValues } from "@/components/monitor-form/types";
import { Prompt } from "@/components/ui/Prompt";
import { requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Edit monitor" };

const INTERVALS = new Set(["5", "10", "30", "60"]);

function isInterval(v: string): v is MonitorFormValues["intervalMinutes"] {
  return INTERVALS.has(v);
}

export default async function EditMonitorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const m = await db.monitor.findFirst({ where: { id, project: { ownerId: user.id } } });
  if (!m) notFound();

  const interval = String(m.intervalMinutes);
  const initial: MonitorFormValues = {
    name: m.name,
    url: m.url,
    method: m.method,
    expectedStatus: String(m.expectedStatus),
    keyword: m.keyword ?? "",
    timeoutSeconds: String(Math.round(m.timeoutMs / 1000)),
    intervalMinutes: isInterval(interval) ? interval : "5",
    checkSsl: m.checkSsl,
  };

  return (
    <>
      <Link href={`/monitors/${m.id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-fg-3 no-underline hover:text-fg">
        <span aria-hidden="true">&lt;-</span> {m.name}
      </Link>
      <div className="mb-4">
        <Prompt>heartbeat edit {m.id.slice(-6)}</Prompt>
        <h1 className="m-0 text-[24px]/[28px] tracking-[-0.03em] md:text-xl">Edit {m.name}</h1>
        <p className="prose-text mt-1 text-prose text-fg-2">Changes apply from the next check.</p>
      </div>
      <MonitorForm mode="edit" monitorId={m.id} initial={initial} />
      <section aria-labelledby="danger-h" className="mt-8 border border-dashed border-down/60 p-4">
        <h2 id="danger-h" className="pane-title mb-2 text-down">
          delete
        </h2>
        <p className="prose-text mt-0 mb-3 text-sm text-fg-2">Removes this monitor with all its checks and incidents. This can&apos;t be undone.</p>
        <DeleteMonitor monitorId={m.id} name={m.name} />
      </section>
    </>
  );
}
