import { describe, expect, it } from "vitest";
import { aggregateChecks, mergeRollups, rollupCutoff, type MonitorCheck } from "./rollup";

describe("rollup job logic", () => {
  it("cutoff is UTC midnight 30 days before today, so only whole days are rolled up", () => {
    expect(rollupCutoff(new Date("2026-11-10T15:42:00Z")).toISOString()).toBe("2026-10-11T00:00:00.000Z");
  });

  it("aggregates raw checks into one row per monitor per UTC day", () => {
    const checks: MonitorCheck[] = [
      { monitorId: "a", checkedAt: new Date("2026-10-01T00:00:00Z"), ok: true, responseMs: 100 },
      { monitorId: "a", checkedAt: new Date("2026-10-01T23:59:59Z"), ok: true, responseMs: 300 },
      { monitorId: "a", checkedAt: new Date("2026-10-01T12:00:00Z"), ok: false, responseMs: 9000 },
      { monitorId: "a", checkedAt: new Date("2026-10-02T00:00:00Z"), ok: true, responseMs: 50 },
      { monitorId: "b", checkedAt: new Date("2026-10-01T05:00:00Z"), ok: false, responseMs: null },
    ];
    const key = (r: { monitorId: string; day: Date }) => `${r.monitorId}${r.day.toISOString()}`;
    const rows = aggregateChecks(checks).sort((x, y) => key(x).localeCompare(key(y)));
    expect(rows).toEqual([
      // failed checks are excluded from the average response time
      { monitorId: "a", day: new Date("2026-10-01T00:00:00Z"), totalChecks: 3, upChecks: 2, avgResponseMs: 200 },
      { monitorId: "a", day: new Date("2026-10-02T00:00:00Z"), totalChecks: 1, upChecks: 1, avgResponseMs: 50 },
      { monitorId: "b", day: new Date("2026-10-01T00:00:00Z"), totalChecks: 1, upChecks: 0, avgResponseMs: null },
    ]);
  });

  it("merging into an existing day adds counts and weights the average", () => {
    const day = new Date("2026-10-01T00:00:00Z");
    const merged = mergeRollups(
      { day, totalChecks: 10, upChecks: 8, avgResponseMs: 100 },
      { day, totalChecks: 2, upChecks: 2, avgResponseMs: 400 },
    );
    expect(merged).toEqual({ day, totalChecks: 12, upChecks: 10, avgResponseMs: 160 });
  });

  it("aggregating nothing produces nothing, so re-running after the delete is a no-op", () => {
    expect(aggregateChecks([])).toEqual([]);
  });
});
