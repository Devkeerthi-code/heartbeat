import { db } from "@/lib/db";
import { rollupCutoff } from "./rollup";

export type RollupSummary = { cutoff: string; rolledGroups: number; deletedChecks: number; expiredSessions: number };

/**
 * Folds raw checks older than the retention window into DailyRollup, then deletes them,
 * in one transaction. The upsert mirrors mergeRollups() (unit-tested): counts add up and the
 * average is weighted by successful checks. Re-running is safe: the second run finds nothing.
 */
export async function runRollup(now = new Date()): Promise<RollupSummary> {
  const cutoff = rollupCutoff(now);
  const result = await db.$transaction(
    async (tx) => {
      const rolledGroups = await tx.$executeRaw`
        INSERT INTO "DailyRollup" ("monitorId", "day", "totalChecks", "upChecks", "avgResponseMs")
        SELECT "monitorId", "checkedAt"::date, count(*)::int, (count(*) FILTER (WHERE ok))::int,
               round(avg("responseMs") FILTER (WHERE ok))::int
        FROM "Check" WHERE "checkedAt" < ${cutoff}
        GROUP BY "monitorId", "checkedAt"::date
        ON CONFLICT ("monitorId", "day") DO UPDATE SET
          "avgResponseMs" = CASE
            WHEN "DailyRollup"."avgResponseMs" IS NULL THEN EXCLUDED."avgResponseMs"
            WHEN EXCLUDED."avgResponseMs" IS NULL THEN "DailyRollup"."avgResponseMs"
            ELSE round(("DailyRollup"."avgResponseMs" * "DailyRollup"."upChecks" + EXCLUDED."avgResponseMs" * EXCLUDED."upChecks")::numeric
                       / GREATEST(1, "DailyRollup"."upChecks" + EXCLUDED."upChecks"))::int
          END,
          "totalChecks" = "DailyRollup"."totalChecks" + EXCLUDED."totalChecks",
          "upChecks" = "DailyRollup"."upChecks" + EXCLUDED."upChecks"`;
      const deleted = await tx.check.deleteMany({ where: { checkedAt: { lt: cutoff } } });
      return { rolledGroups, deletedChecks: deleted.count };
    },
    { timeout: 30_000 },
  );
  const sessions = await db.session.deleteMany({ where: { expiresAt: { lt: now } } });
  await db.rateLimit.deleteMany({ where: { resetAt: { lt: now } } });
  return { cutoff: cutoff.toISOString(), ...result, expiredSessions: sessions.count };
}
