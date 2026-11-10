/**
 * DEMO data only. Creates one clearly labelled demo account, project, monitors and ~90 days of
 * synthetic history so the dashboard and status page have something to show.
 * Raw checks are generated for 35 days, then the real rollup job folds days 31–35 into rollups,
 * which exercises the retention logic. Days 36–90 are inserted as rollups directly.
 *
 *   npm run db:seed
 * The demo password comes from SEED_DEMO_PASSWORD, or a random one is generated and printed.
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { runRollup } from "../src/lib/monitoring/rollup-db";
import { DAY_MS, startOfUtcDay } from "../src/lib/monitoring/uptime";

const DEMO_EMAIL = "demo@heartbeat.demo";
const MINUTE = 60_000;

/** Small seeded PRNG so the demo history is the same on every run. */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Outage = { startDaysAgo: number; minutes: number; cause: string };

type DemoMonitor = {
  name: string;
  url: string;
  intervalMinutes: 5 | 10 | 30 | 60;
  keyword?: string;
  baseMs: number;
  jitterMs: number;
  outages: Outage[];
  /** Still down right now (open incident). */
  downNowMinutes?: number;
};

const MONITORS: DemoMonitor[] = [
  {
    name: "DEMO · Portfolio",
    url: "https://example.com",
    intervalMinutes: 5,
    baseMs: 180,
    jitterMs: 90,
    outages: [
      { startDaysAgo: 3.4, minutes: 38, cause: "Expected 200, got 503" },
      { startDaysAgo: 19.2, minutes: 12, cause: "Timed out after 10s" },
      { startDaysAgo: 47.5, minutes: 95, cause: "DNS lookup failed" },
    ],
  },
  {
    name: "DEMO · Coding club site",
    url: "https://www.iana.org/help/example-domains",
    intervalMinutes: 10,
    keyword: "example",
    baseMs: 420,
    jitterMs: 220,
    outages: [{ startDaysAgo: 11.7, minutes: 64, cause: 'Keyword "example" not found' }],
  },
  {
    name: "DEMO · Café menu API",
    url: "https://httpbin.org/status/503",
    intervalMinutes: 5,
    baseMs: 260,
    jitterMs: 140,
    outages: [{ startDaysAgo: 62.1, minutes: 240, cause: "Connection refused" }],
    downNowMinutes: 40,
  },
  {
    name: "DEMO · Hackathon landing page",
    url: "https://www.wikipedia.org",
    intervalMinutes: 30,
    baseMs: 310,
    jitterMs: 120,
    outages: [],
  },
];

function isInOutage(t: number, now: number, outages: Outage[]): Outage | undefined {
  return outages.find((o) => {
    const start = now - o.startDaysAgo * DAY_MS;
    return t >= start && t < start + o.minutes * MINUTE;
  });
}

async function insertChecks(monitorId: string, m: DemoMonitor, now: number, rand: () => number): Promise<void> {
  const rows: Array<{ monitorId: string; checkedAt: Date; ok: boolean; statusCode: number | null; responseMs: number | null; error: string | null }> = [];
  const step = m.intervalMinutes * MINUTE;
  for (let t = now - 35 * DAY_MS; t <= now; t += step) {
    const downNow = m.downNowMinutes !== undefined && t >= now - m.downNowMinutes * MINUTE;
    const outage = isInOutage(t, now, m.outages);
    const ok = !downNow && !outage;
    const ms = Math.round(m.baseMs + rand() * m.jitterMs + (rand() < 0.02 ? 900 : 0));
    rows.push({
      monitorId,
      checkedAt: new Date(t),
      ok,
      statusCode: ok ? 200 : downNow ? 503 : null,
      responseMs: ok ? ms : Math.round(ms * 0.6),
      error: ok ? null : downNow ? "Expected 200, got 503" : (outage?.cause ?? "Check failed"),
    });
  }
  for (let i = 0; i < rows.length; i += 5000) await db.check.createMany({ data: rows.slice(i, i + 5000) });
}

async function insertOldRollups(monitorId: string, m: DemoMonitor, now: number, rand: () => number): Promise<void> {
  const perDay = (24 * 60) / m.intervalMinutes;
  const today = startOfUtcDay(new Date(now)).getTime();
  const rows = [];
  for (let d = 36; d < 90; d++) {
    const day = today - d * DAY_MS;
    const outageMinutes = m.outages
      .filter((o) => startOfUtcDay(new Date(now - o.startDaysAgo * DAY_MS)).getTime() === day)
      .reduce((s, o) => s + o.minutes, 0);
    const down = Math.min(perDay, Math.ceil(outageMinutes / m.intervalMinutes));
    rows.push({ monitorId, day: new Date(day), totalChecks: perDay, upChecks: perDay - down, avgResponseMs: Math.round(m.baseMs + rand() * m.jitterMs * 0.6) });
  }
  await db.dailyRollup.createMany({ data: rows });
}

async function insertIncidents(monitorId: string, m: DemoMonitor, now: number): Promise<void> {
  const resolved = m.outages.map((o) => {
    const startedAt = new Date(now - o.startDaysAgo * DAY_MS);
    return { monitorId, startedAt, resolvedAt: new Date(startedAt.getTime() + o.minutes * MINUTE), durationSec: o.minutes * 60, cause: o.cause };
  });
  const open = m.downNowMinutes ? [{ monitorId, startedAt: new Date(now - m.downNowMinutes * MINUTE), resolvedAt: null, durationSec: null, cause: "Expected 200, got 503" }] : [];
  await db.incident.createMany({ data: [...resolved, ...open] });
}

async function main(): Promise<void> {
  const password = process.env.SEED_DEMO_PASSWORD || randomBytes(9).toString("base64url");
  await db.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await db.user.create({
    // Demo account never emails anyone: alerts are off so real checks on the DEMO monitors stay quiet.
    data: { email: DEMO_EMAIL, passwordHash: await hashPassword(password), emailAlerts: false, pushAlerts: false },
  });
  await db.project.deleteMany({ where: { slug: "demo-coding-club" } });
  const project = await db.project.create({
    data: {
      ownerId: user.id,
      name: "DEMO · Coding Club",
      slug: "demo-coding-club",
      note: "DEMO note: planned maintenance on the café menu API, Saturday 10:00–11:00 IST.",
      noteUpdatedAt: new Date(),
    },
  });

  const now = Date.now();
  for (const [i, m] of MONITORS.entries()) {
    const rand = rng(1000 + i);
    const down = m.downNowMinutes !== undefined;
    const monitor = await db.monitor.create({
      data: {
        projectId: project.id,
        name: m.name,
        url: m.url,
        keyword: m.keyword ?? null,
        intervalMinutes: m.intervalMinutes,
        timeoutMs: 10_000,
        status: down ? "DOWN" : "UP",
        consecutiveFailures: down ? Math.floor((m.downNowMinutes ?? 0) / m.intervalMinutes) : 0,
        lastCheckedAt: new Date(now),
        lastResponseMs: m.baseMs,
        lastError: down ? "Expected 200, got 503" : null,
        nextCheckAt: new Date(now + m.intervalMinutes * MINUTE),
        sslExpiresAt: new Date(now + (i === 1 ? 9 : 60 + i * 20) * DAY_MS),
      },
    });
    await insertChecks(monitor.id, m, now, rand);
    await insertOldRollups(monitor.id, m, now, rand);
    await insertIncidents(monitor.id, m, now);
    console.log(`  seeded ${m.name}`);
  }

  const rollup = await runRollup(new Date(now));
  console.log(`  rollup job: folded ${rollup.deletedChecks} raw checks into ${rollup.rolledGroups} daily rows`);
  console.log("\nDEMO account ready (local only, do not publish):");
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(`  password: ${password}`);
  console.log(`  status page: /status/${project.slug}`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
