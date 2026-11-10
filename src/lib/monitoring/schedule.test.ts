import { describe, expect, it } from "vitest";
import { computeNextCheckAt, isDue, selectDueMonitors, type SchedulableMonitor } from "./schedule";

const now = new Date("2026-11-10T12:00:00Z");
const m = (id: string, nextCheckAt: string, extra: Partial<SchedulableMonitor> = {}): SchedulableMonitor => ({
  id,
  paused: false,
  nextCheckAt: new Date(nextCheckAt),
  claimedUntil: null,
  ...extra,
});

describe("due-monitor selection", () => {
  it("selects monitors whose nextCheckAt has passed, including exactly now", () => {
    expect(isDue(m("a", "2026-11-10T11:59:00Z"), now)).toBe(true);
    expect(isDue(m("b", "2026-11-10T12:00:00Z"), now)).toBe(true);
    expect(isDue(m("c", "2026-11-10T12:00:01Z"), now)).toBe(false);
  });

  it("skips paused monitors", () => {
    expect(isDue(m("a", "2026-11-10T11:00:00Z", { paused: true }), now)).toBe(false);
  });

  it("skips monitors claimed by another in-flight run, but not expired claims", () => {
    expect(isDue(m("a", "2026-11-10T11:00:00Z", { claimedUntil: new Date("2026-11-10T12:01:00Z") }), now)).toBe(false);
    expect(isDue(m("b", "2026-11-10T11:00:00Z", { claimedUntil: new Date("2026-11-10T11:58:00Z") }), now)).toBe(true);
  });

  it("orders most-overdue first and respects the batch limit", () => {
    const list = [m("new", "2026-11-10T11:55:00Z"), m("old", "2026-11-10T10:00:00Z"), m("mid", "2026-11-10T11:00:00Z"), m("future", "2026-11-10T13:00:00Z")];
    expect(selectDueMonitors(list, now, 2).map((x) => x.id)).toEqual(["old", "mid"]);
  });

  it("schedules the next check one interval later minus a 30s grace window", () => {
    expect(computeNextCheckAt(now, 5).toISOString()).toBe("2026-11-10T12:04:30.000Z");
    expect(computeNextCheckAt(now, 60).toISOString()).toBe("2026-11-10T12:59:30.000Z");
  });

  it("a 5-minute monitor is due again on the next 5-minute cron tick even if the cron is a few seconds early", () => {
    const next = computeNextCheckAt(now, 5);
    expect(isDue(m("a", next.toISOString()), new Date("2026-11-10T12:04:55Z"))).toBe(true);
  });
});
