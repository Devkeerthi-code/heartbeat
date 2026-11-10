import { Resend } from "resend";
import webpush from "web-push";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { dispatchAlerts, type AlertStore } from "./dispatch";
import { planAlerts, type AlertEvent, type PlannedAlert } from "./plan";
import { renderAlert, type AlertContext } from "./templates";

const prismaAlertStore: AlertStore = {
  async reserve(alert) {
    const { count } = await db.alertLog.createMany({
      data: [
        {
          monitorId: alert.event.monitorId,
          incidentId: alert.event.kind === "SSL_EXPIRING" ? null : alert.event.incidentId,
          kind: alert.event.kind,
          channel: alert.channel,
          dedupeKey: alert.dedupeKey,
        },
      ],
      skipDuplicates: true,
    });
    return count === 1;
  },
  async markSent(dedupeKey) {
    await db.alertLog.update({ where: { dedupeKey }, data: { state: "SENT" } });
  },
  async markFailed(dedupeKey, error) {
    await db.alertLog.update({ where: { dedupeKey }, data: { state: "FAILED", error } });
  },
};

async function sendEmail(to: string, subject: string, text: string, html: string): Promise<void> {
  const { RESEND_API_KEY, EMAIL_FROM } = env();
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
  const { error } = await new Resend(RESEND_API_KEY).emails.send({ from: EMAIL_FROM, to, subject, text, html });
  if (error) throw new Error(`Resend: ${error.message}`);
}

async function sendPush(userId: string, title: string, body: string, url: string): Promise<void> {
  const { NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = env();
  if (!NEXT_PUBLIC_VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) throw new Error("VAPID keys are not set");
  webpush.setVapidDetails(VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const subs = await db.pushSubscription.findMany({ where: { userId } });
  const payload = JSON.stringify({ title, body, url });
  const results = await Promise.allSettled(
    subs.map((s) => webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 })),
  );
  const gone: string[] = [];
  results.forEach((r, i) => {
    const code = r.status === "rejected" ? (r.reason as { statusCode?: number }).statusCode : undefined;
    if (code === 404 || code === 410) gone.push(subs[i]!.id); // browser unsubscribed
  });
  if (gone.length) await db.pushSubscription.deleteMany({ where: { id: { in: gone } } });
  if (results.length > 0 && results.every((r) => r.status === "rejected")) throw new Error("All push deliveries failed");
}

async function loadContext(monitorId: string): Promise<(AlertContext & { userId: string; email: string; prefs: Parameters<typeof planAlerts>[1] }) | null> {
  const m = await db.monitor.findUnique({
    where: { id: monitorId },
    select: {
      id: true,
      name: true,
      url: true,
      lastError: true,
      project: { select: { slug: true, owner: { select: { id: true, email: true, emailAlerts: true, pushAlerts: true, _count: { select: { pushSubscriptions: true } } } } } },
    },
  });
  if (!m) return null;
  const owner = m.project.owner;
  return {
    userId: owner.id,
    email: owner.email,
    prefs: { emailAlerts: owner.emailAlerts, pushAlerts: owner.pushAlerts, hasPushSubscription: owner._count.pushSubscriptions > 0 },
    monitorName: m.name,
    monitorUrl: m.url,
    lastError: m.lastError,
    dashboardUrl: `${env().APP_URL}/monitors/${m.id}`,
    statusUrl: `${env().APP_URL}/status/${m.project.slug}`,
  };
}

/** Plans and sends the alerts for one event. Failures are logged on the AlertLog row, never thrown into the run. */
export async function sendAlertEvent(event: AlertEvent): Promise<void> {
  const ctx = await loadContext(event.monitorId);
  if (!ctx) return;
  const incident =
    event.kind === "SSL_EXPIRING" ? null : await db.incident.findUnique({ where: { id: event.incidentId }, select: { startedAt: true, durationSec: true } });
  const message = renderAlert(event, ctx, incident, new Date());
  const send = async (alert: PlannedAlert) => {
    if (alert.channel === "EMAIL") await sendEmail(ctx.email, message.subject, message.text, message.html);
    else await sendPush(ctx.userId, message.subject, message.short, ctx.dashboardUrl);
  };
  try {
    await dispatchAlerts(planAlerts(event, ctx.prefs), prismaAlertStore, send);
  } catch (err) {
    console.error("[alerts] dispatch failed", err);
  }
}
