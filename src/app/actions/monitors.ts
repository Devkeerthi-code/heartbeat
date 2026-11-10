"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { rateLimit } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { runHttpCheck } from "@/lib/monitoring/http-check";
import { runSingleCheck } from "@/lib/monitoring/run-db";
import { hostnameResolvesPrivate } from "@/lib/monitoring/ssrf-dns";
import { track } from "@/lib/usage";
import { fieldErrors, monitorSchema, type MonitorInput } from "@/lib/validation";
import { formValues, type ActionState } from "./types";

/** Keeps a free-tier deployment from being turned into a crawler. */
const MAX_MONITORS_PER_USER = 20;

type Parsed = { ok: true; data: MonitorInput } | { ok: false; state: ActionState };

async function parseMonitor(formData: FormData): Promise<Parsed> {
  const values = formValues(formData);
  const parsed = monitorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, state: { errors: fieldErrors(parsed.error), values } };
  if (await hostnameResolvesPrivate(new URL(parsed.data.url).hostname)) {
    return { ok: false, state: { errors: { url: "This hostname points to a private address, so it can't be monitored." }, values } };
  }
  return { ok: true, data: parsed.data };
}

const toColumns = (d: MonitorInput) => ({
  name: d.name,
  url: d.url,
  method: d.method,
  expectedStatus: d.expectedStatus,
  keyword: d.keyword,
  timeoutMs: d.timeoutSeconds * 1000,
  intervalMinutes: d.intervalMinutes,
  checkSsl: d.checkSsl && d.url.startsWith("https://"),
});

async function ownedMonitor(userId: string, monitorId: string) {
  return db.monitor.findFirst({ where: { id: monitorId, project: { ownerId: userId } }, select: { id: true, projectId: true } });
}

export async function createMonitorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") ?? "");
  const project = await db.project.findFirst({ where: { id: projectId, ownerId: user.id }, select: { id: true } });
  if (!project) return { message: "That project doesn't exist or isn't yours." };

  const count = await db.monitor.count({ where: { project: { ownerId: user.id } } });
  if (count >= MAX_MONITORS_PER_USER) return { message: `You can have up to ${MAX_MONITORS_PER_USER} monitors on the free plan.` };

  const parsed = await parseMonitor(formData);
  if (!parsed.ok) return parsed.state;
  const monitor = await db.monitor.create({ data: { ...toColumns(parsed.data), projectId: project.id, nextCheckAt: new Date() } });
  track("monitor_created", user.id);
  revalidatePath("/dashboard");
  redirect(`/monitors/${monitor.id}?created=1`);
}

export async function updateMonitorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const monitor = await ownedMonitor(user.id, String(formData.get("monitorId") ?? ""));
  if (!monitor) return { message: "Monitor not found." };
  const parsed = await parseMonitor(formData);
  if (!parsed.ok) return parsed.state;
  await db.monitor.update({ where: { id: monitor.id }, data: toColumns(parsed.data) });
  revalidatePath(`/monitors/${monitor.id}`);
  redirect(`/monitors/${monitor.id}?saved=1`);
}

export async function deleteMonitorAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const monitor = await ownedMonitor(user.id, String(formData.get("monitorId") ?? ""));
  if (monitor) await db.monitor.delete({ where: { id: monitor.id } });
  revalidatePath("/dashboard");
  redirect("/dashboard?deleted=1");
}

export async function togglePauseAction(monitorId: string): Promise<ActionState> {
  const user = await requireUser();
  const monitor = await db.monitor.findFirst({ where: { id: monitorId, project: { ownerId: user.id } }, select: { id: true, paused: true } });
  if (!monitor) return { message: "Monitor not found." };
  const paused = !monitor.paused;
  await db.monitor.update({
    where: { id: monitor.id },
    // Resuming checks immediately; pausing resets the streak so a resume never alerts on stale failures.
    data: paused ? { paused, consecutiveFailures: 0 } : { paused, nextCheckAt: new Date() },
  });
  revalidatePath(`/monitors/${monitor.id}`);
  revalidatePath("/dashboard");
  return { ok: true, message: paused ? "Paused. No checks or alerts until you resume." : "Resumed. Checking on the next run." };
}

export async function checkNowAction(monitorId: string): Promise<ActionState> {
  const user = await requireUser();
  const monitor = await ownedMonitor(user.id, monitorId);
  if (!monitor) return { message: "Monitor not found." };
  if (!(await rateLimit(`checknow:${user.id}`, 10, 60_000))) return { message: "Easy — max 10 manual checks a minute." };
  const result = await runSingleCheck(monitor.id);
  if (!result) return { message: "A scheduled check is running right now. Try again in a moment." };
  track("check_now", user.id);
  revalidatePath(`/monitors/${monitor.id}`);
  revalidatePath("/dashboard");
  return result.ok
    ? { ok: true, message: `Up — responded in ${result.responseMs} ms.` }
    : { ok: false, message: `Check failed: ${result.error ?? "unknown error"}` };
}

export type TestResult = ActionState & { statusCode?: number | null; responseMs?: number; sslExpiresAt?: string | null };

/** "Test now" in the form: runs the check without saving anything. */
export async function testMonitorAction(_prev: TestResult, formData: FormData): Promise<TestResult> {
  const user = await requireUser();
  if (!(await rateLimit(`test:${user.id}`, 10, 60_000))) return { message: "Max 10 test runs a minute." };
  const parsed = await parseMonitor(formData);
  if (!parsed.ok) return parsed.state;
  const r = await runHttpCheck({ ...toColumns(parsed.data), timeoutMs: parsed.data.timeoutSeconds * 1000 });
  return {
    ok: r.ok,
    message: r.ok ? "Check passed. Save the monitor to start watching it." : (r.error ?? "Check failed"),
    statusCode: r.statusCode,
    responseMs: r.responseMs,
    sslExpiresAt: r.sslExpiresAt?.toISOString() ?? null,
  };
}
