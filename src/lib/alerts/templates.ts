import { escapeHtml, formatDuration, formatUtc } from "@/lib/format";
import { daysUntil, type AlertEvent } from "./plan";

export type AlertContext = {
  monitorName: string;
  monitorUrl: string;
  lastError: string | null;
  dashboardUrl: string;
  statusUrl: string;
};

export type RenderedAlert = { subject: string; short: string; text: string; html: string };

type IncidentInfo = { startedAt: Date; durationSec: number | null } | null;

function lines(event: AlertEvent, ctx: AlertContext, incident: IncidentInfo, now: Date): { subject: string; short: string; body: string[] } {
  if (event.kind === "DOWN") {
    return {
      subject: `[DOWN] ${ctx.monitorName} is not responding`,
      short: `${ctx.monitorName} failed 2 checks in a row: ${ctx.lastError ?? "check failed"}`,
      body: [
        `${ctx.monitorName} (${ctx.monitorUrl}) failed two checks in a row.`,
        `Reason: ${ctx.lastError ?? "check failed"}`,
        incident ? `Down since: ${formatUtc(incident.startedAt)}` : "",
        "You'll get one more email when it recovers.",
      ],
    };
  }
  if (event.kind === "RECOVERED") {
    const took = incident?.durationSec != null ? formatDuration(incident.durationSec) : "an unknown time";
    return {
      subject: `[RECOVERED] ${ctx.monitorName} is back up`,
      short: `${ctx.monitorName} is responding again after ${took}`,
      body: [`${ctx.monitorName} (${ctx.monitorUrl}) is responding again.`, `It was down for ${took}.`],
    };
  }
  const days = daysUntil(event.sslExpiresAt, now);
  const when = days <= 0 ? "has expired" : `expires in ${days} day${days === 1 ? "" : "s"}`;
  return {
    subject: `[SSL] Certificate for ${ctx.monitorName} ${when}`,
    short: `SSL certificate ${when} (${formatUtc(event.sslExpiresAt)})`,
    body: [
      `The SSL certificate for ${ctx.monitorUrl} ${when} (${formatUtc(event.sslExpiresAt)}).`,
      "Renew it before visitors start seeing a browser security warning. This is the only warning you'll get for this certificate.",
    ],
  };
}

export function renderAlert(event: AlertEvent, ctx: AlertContext, incident: IncidentInfo, now: Date): RenderedAlert {
  const { subject, short, body } = lines(event, ctx, incident, now);
  const content = body.filter(Boolean);
  const text = [...content, "", `Monitor: ${ctx.dashboardUrl}`, `Public status page: ${ctx.statusUrl}`].join("\n");
  const html = `<div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:14px;line-height:1.6;color:#111">
${content.map((l) => `<p style="margin:0 0 8px">${escapeHtml(l)}</p>`).join("\n")}
<p style="margin:16px 0 0"><a href="${escapeHtml(ctx.dashboardUrl)}">Open monitor</a> · <a href="${escapeHtml(ctx.statusUrl)}">Status page</a></p>
<p style="margin:16px 0 0;color:#666;font-size:12px">Sent by Heartbeat. Change alert settings in your dashboard.</p>
</div>`;
  return { subject, short, text, html };
}
