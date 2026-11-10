import { describe, expect, it } from "vitest";
import type { AlertEvent } from "@/lib/alerts/plan";
import type { CheckResult } from "./http-check";
import { buildOutcome, runCheckBatch, type CheckOutcome, type ClaimedMonitor, type RunDeps } from "./run";

const baseMonitor: ClaimedMonitor = {
  id: "m1",
  url: "https://example.com",
  method: "GET",
  expectedStatus: 200,
  keyword: null,
  timeoutMs: 5000,
  intervalMinutes: 5,
  checkSsl: true,
  status: "UP",
  consecutiveFailures: 0,
  lastCheckedAt: null,
};

const ok: CheckResult = { ok: true, statusCode: 200, responseMs: 120, error: null, sslExpiresAt: new Date("2027-06-01T00:00:00Z") };
const fail: CheckResult = { ok: false, statusCode: 502, responseMs: 300, error: "Expected 200, got 502", sslExpiresAt: null };

/** A tiny in-memory "database" that mimics persist(): one open incident per monitor. */
function fakeWorld(monitors: ClaimedMonitor[], results: Map<string, CheckResult[]>, startMs = Date.parse("2026-11-10T12:00:00Z")) {
  let clock = startMs;
  const state = new Map(monitors.map((m) => [m.id, { ...m }]));
  const incidents: Array<{ id: string; monitorId: string; startedAt: Date; resolvedAt: Date | null }> = [];
  const alerts: AlertEvent[] = [];
  const released: string[] = [];
  const deps: RunDeps = {
    now: () => new Date(clock),
    claimDue: async () => [...state.values()].map((m) => ({ ...m })),
    release: async (ids) => void released.push(...ids),
    check: async (cfg) => {
      const id = [...state.values()].find((m) => m.url === cfg.url)!.id;
      return results.get(id)!.shift()!;
    },
    persist: async (o: CheckOutcome) => {
      const m = state.get(o.monitorId)!;
      Object.assign(m, { status: o.monitor.status, consecutiveFailures: o.monitor.consecutiveFailures, lastCheckedAt: o.monitor.lastCheckedAt });
      if (o.incident.type === "open") {
        const inc = { id: `inc${incidents.length + 1}`, monitorId: m.id, startedAt: o.incident.startedAt, resolvedAt: null };
        incidents.push(inc);
        return inc.id;
      }
      if (o.incident.type === "close") {
        const open = incidents.find((i) => i.monitorId === m.id && !i.resolvedAt);
        if (open) open.resolvedAt = o.incident.resolvedAt;
        return open?.id ?? null;
      }
      return null;
    },
    alert: async (e) => void alerts.push(e),
  };
  const tick = async (advanceMin = 5) => {
    const summary = await runCheckBatch(deps, { batchSize: 50, concurrency: 4, budgetMs: 20_000 });
    clock += advanceMin * 60_000;
    return summary;
  };
  return { deps, incidents, alerts, released, tick, setClock: (ms: number) => (clock = ms) };
}

describe("buildOutcome", () => {
  it("opens the incident at the time of the first failure in the streak", () => {
    const prevFailureAt = new Date("2026-11-10T11:55:00Z");
    const o = buildOutcome({ ...baseMonitor, consecutiveFailures: 1, lastCheckedAt: prevFailureAt }, fail, new Date("2026-11-10T12:00:00Z"));
    expect(o.incident).toEqual({ type: "open", startedAt: prevFailureAt, cause: "Expected 200, got 502" });
    expect(o.monitor.status).toBe("DOWN");
  });

  it("drops the SSL expiry when SSL checking is off", () => {
    expect(buildOutcome({ ...baseMonitor, checkSsl: false }, ok, new Date()).monitor.sslExpiresAt).toBeNull();
  });
});

describe("incident lifecycle across cron runs", () => {
  it("fail → fail opens one incident and one DOWN alert; recovery closes it with one RECOVERED alert", async () => {
    const w = fakeWorld([baseMonitor], new Map([["m1", [fail, fail, fail, ok, ok]]]));
    for (let i = 0; i < 5; i++) await w.tick();
    expect(w.incidents).toHaveLength(1);
    expect(w.incidents[0]?.resolvedAt).not.toBeNull();
    expect(w.alerts.map((a) => a.kind)).toEqual(["DOWN", "RECOVERED"]);
    const inc = w.incidents[0]!;
    expect((inc.resolvedAt!.getTime() - inc.startedAt.getTime()) / 60_000).toBe(15);
  });

  it("a single blip never alerts", async () => {
    const w = fakeWorld([baseMonitor], new Map([["m1", [ok, fail, ok]]]));
    for (let i = 0; i < 3; i++) await w.tick();
    expect(w.incidents).toHaveLength(0);
    expect(w.alerts).toHaveLength(0);
  });

  it("emits an SSL warning event when the certificate expires within 14 days", async () => {
    const soon: CheckResult = { ...ok, sslExpiresAt: new Date("2026-11-15T00:00:00Z") };
    const w = fakeWorld([baseMonitor], new Map([["m1", [soon]]]));
    await w.tick();
    expect(w.alerts).toEqual([{ kind: "SSL_EXPIRING", monitorId: "m1", sslExpiresAt: soon.sslExpiresAt }]);
  });

  it("defers and releases monitors once the time budget is spent", async () => {
    const monitors = Array.from({ length: 6 }, (_, i) => ({ ...baseMonitor, id: `m${i}`, url: `https://s${i}.example.com` }));
    const w = fakeWorld(monitors, new Map(monitors.map((m) => [m.id, [ok]])));
    let calls = 0;
    const slowCheck = w.deps.check;
    w.deps.check = async (cfg) => {
      calls += 1;
      w.setClock(Date.parse("2026-11-10T12:00:00Z") + calls * 15_000); // each check "takes" 15s
      return slowCheck(cfg);
    };
    const summary = await runCheckBatch(w.deps, { batchSize: 50, concurrency: 1, budgetMs: 20_000 });
    expect(summary.checked).toBe(2);
    expect(summary.deferred).toBe(4);
    expect(w.released).toHaveLength(4);
  });
});
