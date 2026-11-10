import type { AlertEvent } from "@/lib/alerts/plan";
import { shouldWarnSsl } from "@/lib/alerts/plan";
import { mapWithConcurrency } from "./concurrency";
import type { CheckConfig, CheckResult } from "./http-check";
import { computeNextCheckAt } from "./schedule";
import { nextState, type MonitorState } from "./state";

export type ClaimedMonitor = CheckConfig & {
  id: string;
  intervalMinutes: number;
  checkSsl: boolean;
  status: MonitorState;
  consecutiveFailures: number;
  lastCheckedAt: Date | null;
};

export type IncidentAction =
  | { type: "none" }
  | { type: "open"; startedAt: Date; cause: string }
  | { type: "close"; resolvedAt: Date };

export type CheckOutcome = {
  monitorId: string;
  check: { checkedAt: Date; ok: boolean; statusCode: number | null; responseMs: number; error: string | null };
  monitor: {
    status: MonitorState;
    consecutiveFailures: number;
    lastCheckedAt: Date;
    lastResponseMs: number;
    lastError: string | null;
    nextCheckAt: Date;
    sslExpiresAt: Date | null;
  };
  incident: IncidentAction;
};

/** Pure: turns one check result into everything that must be written. */
export function buildOutcome(monitor: ClaimedMonitor, result: CheckResult, now: Date): CheckOutcome {
  const t = nextState(monitor, result.ok);
  let incident: IncidentAction = { type: "none" };
  if (t.openIncident) {
    // The incident began at the first failure of the streak, i.e. the previous check.
    incident = { type: "open", startedAt: monitor.lastCheckedAt ?? now, cause: result.error ?? "Check failed" };
  } else if (t.closeIncident) {
    incident = { type: "close", resolvedAt: now };
  }
  return {
    monitorId: monitor.id,
    check: { checkedAt: now, ok: result.ok, statusCode: result.statusCode, responseMs: result.responseMs, error: result.error },
    monitor: {
      status: t.status,
      consecutiveFailures: t.consecutiveFailures,
      lastCheckedAt: now,
      lastResponseMs: result.responseMs,
      lastError: result.error,
      nextCheckAt: computeNextCheckAt(now, monitor.intervalMinutes),
      sslExpiresAt: monitor.checkSsl ? result.sslExpiresAt : null,
    },
    incident,
  };
}

export type RunDeps = {
  now: () => Date;
  claimDue: (now: Date, limit: number) => Promise<ClaimedMonitor[]>;
  release: (monitorIds: string[]) => Promise<void>;
  check: (config: CheckConfig) => Promise<CheckResult>;
  /** Persists the outcome atomically; returns the incident id that was opened or closed, if any. */
  persist: (outcome: CheckOutcome) => Promise<string | null>;
  alert: (event: AlertEvent) => Promise<void>;
};

export type RunOptions = { batchSize: number; concurrency: number; budgetMs: number };

export type RunSummary = { claimed: number; checked: number; deferred: number; up: number; failed: number; alerts: number };

export const DEFAULT_RUN_OPTIONS: RunOptions = { batchSize: 60, concurrency: 10, budgetMs: 20_000 };

/**
 * One cron tick. New checks stop starting once the budget is spent; in-flight checks are
 * bounded by their own timeout (max 30s), so a run ends well inside a 60s function limit.
 * Unstarted monitors are released and picked up by the next tick.
 */
export async function runCheckBatch(deps: RunDeps, options: RunOptions = DEFAULT_RUN_OPTIONS): Promise<RunSummary> {
  const startedAt = deps.now();
  const claimed = await deps.claimDue(startedAt, options.batchSize);
  const summary: RunSummary = { claimed: claimed.length, checked: 0, deferred: 0, up: 0, failed: 0, alerts: 0 };
  const deferred: string[] = [];

  await mapWithConcurrency(claimed, options.concurrency, async (monitor) => {
    if (deps.now().getTime() - startedAt.getTime() > options.budgetMs) {
      deferred.push(monitor.id);
      return;
    }
    const result = await deps.check(monitor);
    const now = deps.now();
    const outcome = buildOutcome(monitor, result, now);
    const incidentId = await deps.persist(outcome);
    summary.checked += 1;
    if (result.ok) summary.up += 1;
    else summary.failed += 1;

    const events: AlertEvent[] = [];
    if (incidentId && outcome.incident.type === "open") events.push({ kind: "DOWN", monitorId: monitor.id, incidentId });
    if (incidentId && outcome.incident.type === "close") events.push({ kind: "RECOVERED", monitorId: monitor.id, incidentId });
    const ssl = outcome.monitor.sslExpiresAt;
    if (ssl && shouldWarnSsl(ssl, now)) events.push({ kind: "SSL_EXPIRING", monitorId: monitor.id, sslExpiresAt: ssl });
    for (const event of events) {
      await deps.alert(event);
      summary.alerts += 1;
    }
  });

  if (deferred.length) await deps.release(deferred);
  summary.deferred = deferred.length;
  return summary;
}

