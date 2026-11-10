/**
 * Triggers one cron run against a running app (default http://localhost:3000), exactly like
 * cron-job.org does, so the CRON_SECRET path is exercised too.
 *   npm run check:once            -> POST /api/cron/check
 *   npm run rollup:once           -> POST /api/cron/rollup
 */
import "dotenv/config";

const job = process.argv.includes("--rollup") ? "rollup" : "check";
const base = process.env.APP_URL ?? "http://localhost:3000";
const secret = process.env.CRON_SECRET;

async function main(): Promise<void> {
  if (!secret) throw new Error("CRON_SECRET is missing from .env");
  const url = `${base}/api/cron/${job}`;
  const res = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${secret}` } }).catch(() => {
    throw new Error(`Could not reach ${url}. Is the app running? Start it with: npm run dev`);
  });
  const body = await res.text();
  console.log(`${res.status} ${url}`);
  console.log(body);
  if (!res.ok) process.exitCode = 1;
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
