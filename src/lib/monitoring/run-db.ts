import { db } from "@/lib/db";
import { sendAlertEvent } from "@/lib/alerts/send";
import { runHttpCheck } from "./http-check";
import { DEFAULT_RUN_OPTIONS, runCheckBatch, type CheckOutcome, type ClaimedMonitor, type RunDeps, type RunSummary } from "./run";
import { incidentDurationSec } from "./state";

const CLAIM_TTL_SECONDS = 120;

/**
 * Atomically claims due monitors. FOR UPDATE SKIP LOCKED + claimedUntil means two overlapping
 * cron calls split the work instead of checking (and alerting on) the same monitor twice.
 */
async function claimDue(now: Date, limit: number): Promise<ClaimedMonitor[]> {
  return db.$queryRaw<ClaimedMonitor[]>`
    UPDATE "Monitor" SET "claimedUntil" = ${new Date(now.getTime() + CLAIM_TTL_SECONDS * 1000)}
    WHERE id IN (
      SELECT id FROM "Monitor"
      WHERE paused = false AND "nextCheckAt" <= ${now}
        AND ("claimedUntil" IS NULL OR "claimedUntil" < ${now})
      ORDER BY "nextCheckAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, url, method::text AS method, "expectedStatus", keyword, "timeoutMs", "intervalMinutes",
              "checkSsl", status::text AS status, "consecutiveFailures", "lastCheckedAt"`;
}

async function release(ids: string[]): Promise<void> {
  await db.monitor.updateMany({ where: { id: { in: ids } }, data: { claimedUntil: null } });
}

async function persist(o: CheckOutcome): Promise<string | null> {
  return db.$transaction(async (tx) => {
    await tx.check.create({ data: { monitorId: o.monitorId, ...o.check } });
    await tx.monitor.update({ where: { id: o.monitorId }, data: { ...o.monitor, claimedUntil: null } });

    if (o.incident.type === "open") {
      // skipDuplicates → ON CONFLICT DO NOTHING against the "one open incident" partial index.
      await tx.incident.createMany({
        data: [{ monitorId: o.monitorId, startedAt: o.incident.startedAt, cause: o.incident.cause.slice(0, 300) }],
        skipDuplicates: true,
      });
      const open = await tx.incident.findFirst({ where: { monitorId: o.monitorId, resolvedAt: null }, select: { id: true } });
      return open?.id ?? null;
    }
    if (o.incident.type === "close") {
      const open = await tx.incident.findFirst({ where: { monitorId: o.monitorId, resolvedAt: null } });
      if (!open) return null;
      await tx.incident.update({
        where: { id: open.id },
        data: { resolvedAt: o.incident.resolvedAt, durationSec: incidentDurationSec(open.startedAt, o.incident.resolvedAt) },
      });
      return open.id;
    }
    return null;
  });
}

export const dbRunDeps: RunDeps = {
  now: () => new Date(),
  claimDue,
  release,
  check: runHttpCheck,
  persist,
  alert: sendAlertEvent,
};

export function runDueChecks(): Promise<RunSummary> {
  return runCheckBatch(dbRunDeps, DEFAULT_RUN_OPTIONS);
}
