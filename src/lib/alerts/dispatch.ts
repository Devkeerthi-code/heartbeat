import type { PlannedAlert } from "./plan";

export type AlertStore = {
  /** Atomically records the alert; returns false if this dedupeKey was already recorded. */
  reserve(alert: PlannedAlert): Promise<boolean>;
  markSent(dedupeKey: string): Promise<void>;
  markFailed(dedupeKey: string, error: string): Promise<void>;
};

export type AlertSender = (alert: PlannedAlert) => Promise<void>;

export type DispatchSummary = { sent: number; skipped: number; failed: number };

/** Reserve-then-send: the unique reservation is what makes alerts idempotent. */
export async function dispatchAlerts(alerts: PlannedAlert[], store: AlertStore, send: AlertSender): Promise<DispatchSummary> {
  const summary: DispatchSummary = { sent: 0, skipped: 0, failed: 0 };
  for (const alert of alerts) {
    if (!(await store.reserve(alert))) {
      summary.skipped += 1;
      continue;
    }
    try {
      await send(alert);
      await store.markSent(alert.dedupeKey);
      summary.sent += 1;
    } catch (err) {
      await store.markFailed(alert.dedupeKey, err instanceof Error ? err.message.slice(0, 300) : "send failed");
      summary.failed += 1;
    }
  }
  return summary;
}
