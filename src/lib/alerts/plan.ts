export const SSL_WARNING_DAYS = 14;

export type AlertKind = "DOWN" | "RECOVERED" | "SSL_EXPIRING";
export type AlertChannel = "EMAIL" | "PUSH";

export type AlertEvent =
  | { kind: "DOWN"; monitorId: string; incidentId: string }
  | { kind: "RECOVERED"; monitorId: string; incidentId: string }
  | { kind: "SSL_EXPIRING"; monitorId: string; sslExpiresAt: Date };

export type ChannelPrefs = { emailAlerts: boolean; pushAlerts: boolean; hasPushSubscription: boolean };

export type PlannedAlert = { event: AlertEvent; channel: AlertChannel; dedupeKey: string };

/**
 * Unique per incident+kind+channel (or per certificate expiry date for SSL), so a retried
 * cron run or an overlapping run can never send the same alert twice.
 */
export function alertDedupeKey(event: AlertEvent, channel: AlertChannel): string {
  if (event.kind === "SSL_EXPIRING") {
    return `ssl:${event.monitorId}:${event.sslExpiresAt.toISOString().slice(0, 10)}:${channel}`;
  }
  return `${event.kind.toLowerCase()}:${event.incidentId}:${channel}`;
}

export function planAlerts(event: AlertEvent, prefs: ChannelPrefs): PlannedAlert[] {
  const channels: AlertChannel[] = [];
  if (prefs.emailAlerts) channels.push("EMAIL");
  if (prefs.pushAlerts && prefs.hasPushSubscription) channels.push("PUSH");
  return channels.map((channel) => ({ event, channel, dedupeKey: alertDedupeKey(event, channel) }));
}

export function shouldWarnSsl(sslExpiresAt: Date | null, now: Date): boolean {
  if (!sslExpiresAt) return false;
  const msLeft = sslExpiresAt.getTime() - now.getTime();
  return msLeft <= SSL_WARNING_DAYS * 86_400_000;
}

export function daysUntil(date: Date, now: Date): number {
  return Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
}
