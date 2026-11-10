import { describe, expect, it, vi } from "vitest";
import { dispatchAlerts, type AlertStore } from "./dispatch";
import { alertDedupeKey, planAlerts, shouldWarnSsl, type AlertEvent, type PlannedAlert } from "./plan";

function memoryStore(): AlertStore & { rows: Map<string, string> } {
  const rows = new Map<string, string>();
  return {
    rows,
    reserve: async (a: PlannedAlert) => {
      if (rows.has(a.dedupeKey)) return false;
      rows.set(a.dedupeKey, "PENDING");
      return true;
    },
    markSent: async (k) => void rows.set(k, "SENT"),
    markFailed: async (k) => void rows.set(k, "FAILED"),
  };
}

const down: AlertEvent = { kind: "DOWN", monitorId: "m1", incidentId: "inc1" };
const prefs = { emailAlerts: true, pushAlerts: true, hasPushSubscription: true };

describe("alert idempotency", () => {
  it("sends each channel once even if the same incident is dispatched repeatedly", async () => {
    const store = memoryStore();
    const send = vi.fn(async () => {});
    const first = await dispatchAlerts(planAlerts(down, prefs), store, send);
    const second = await dispatchAlerts(planAlerts(down, prefs), store, send);
    expect(first).toEqual({ sent: 2, skipped: 0, failed: 0 });
    expect(second).toEqual({ sent: 0, skipped: 2, failed: 0 });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("down and recovery for the same incident are separate alerts", () => {
    const rec: AlertEvent = { kind: "RECOVERED", monitorId: "m1", incidentId: "inc1" };
    expect(alertDedupeKey(down, "EMAIL")).not.toBe(alertDedupeKey(rec, "EMAIL"));
  });

  it("a new incident gets new alerts", () => {
    expect(alertDedupeKey(down, "EMAIL")).not.toBe(alertDedupeKey({ ...down, incidentId: "inc2" }, "EMAIL"));
  });

  it("a failed send is recorded and not re-sent as a duplicate", async () => {
    const store = memoryStore();
    const send = vi.fn(async () => {
      throw new Error("Resend 500");
    });
    const r = await dispatchAlerts(planAlerts(down, { ...prefs, pushAlerts: false }), store, send);
    expect(r).toEqual({ sent: 0, skipped: 0, failed: 1 });
    expect([...store.rows.values()]).toEqual(["FAILED"]);
  });

  it("respects channel preferences and missing push subscriptions", () => {
    const noSub = planAlerts(down, { emailAlerts: true, pushAlerts: true, hasPushSubscription: false });
    expect(noSub.map((a) => a.channel)).toEqual(["EMAIL"]);
    expect(planAlerts(down, { emailAlerts: false, pushAlerts: false, hasPushSubscription: true })).toEqual([]);
  });
});

describe("SSL expiry warning", () => {
  const now = new Date("2026-11-10T00:00:00Z");

  it("warns within 14 days (and when already expired), not before", () => {
    expect(shouldWarnSsl(new Date("2026-11-24T00:00:00Z"), now)).toBe(true);
    expect(shouldWarnSsl(new Date("2026-11-24T00:00:01Z"), now)).toBe(false);
    expect(shouldWarnSsl(new Date("2026-11-01T00:00:00Z"), now)).toBe(true);
    expect(shouldWarnSsl(null, now)).toBe(false);
  });

  it("warns once per certificate: same expiry is deduped, a renewed cert gets a new warning", async () => {
    const cert: AlertEvent = { kind: "SSL_EXPIRING", monitorId: "m1", sslExpiresAt: new Date("2026-11-20T10:00:00Z") };
    const renewed: AlertEvent = { ...cert, sslExpiresAt: new Date("2027-02-18T10:00:00Z") };
    const store = memoryStore();
    const send = vi.fn(async () => {});
    const p = { emailAlerts: true, pushAlerts: false, hasPushSubscription: false };
    await dispatchAlerts(planAlerts(cert, p), store, send);
    await dispatchAlerts(planAlerts({ ...cert }, p), store, send);
    expect(send).toHaveBeenCalledTimes(1);
    await dispatchAlerts(planAlerts(renewed, p), store, send);
    expect(send).toHaveBeenCalledTimes(2);
  });
});
