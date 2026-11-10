import { describe, expect, it } from "vitest";
import { dailyBars, formatUptime, uptimePercent, type RawCheck } from "./uptime";

const c = (iso: string, ok: boolean): RawCheck => ({ checkedAt: new Date(iso), ok });

describe("uptimePercent", () => {
  const now = new Date("2026-11-10T12:00:00Z");
  const from24h = new Date(now.getTime() - 86_400_000);

  it("counts only checks inside the window", () => {
    const checks = [
      c("2026-11-09T11:00:00Z", false),
      c("2026-11-09T13:00:00Z", true),
      c("2026-11-10T11:00:00Z", false),
      c("2026-11-10T11:30:00Z", true),
    ];
    expect(uptimePercent(checks, [], from24h, now)).toBeCloseTo(66.667, 2);
  });

  it("returns null with no data rather than claiming 100%", () => {
    expect(uptimePercent([], [], from24h, now)).toBeNull();
  });

  it("weights a rollup day by how much of it falls in the window (partial days)", () => {
    // Window starts at 18:00 on Nov 1, so only 25% of that day's rollup counts.
    const from = new Date("2026-11-01T18:00:00Z");
    const to = new Date("2026-11-03T00:00:00Z");
    const rollups = [
      { day: new Date("2026-11-01T00:00:00Z"), totalChecks: 288, upChecks: 0 },
      { day: new Date("2026-11-02T00:00:00Z"), totalChecks: 288, upChecks: 288 },
    ];
    // up = 288, total = 72 + 288 = 360 -> 80%
    expect(uptimePercent([], rollups, from, to)).toBeCloseTo(80, 5);
  });

  it("counts today's in-progress totals fully, not as a fraction of a whole day", () => {
    const today = [{ day: new Date("2026-11-10T00:00:00Z"), totalChecks: 10, upChecks: 9 }];
    const yesterday = [{ day: new Date("2026-11-09T00:00:00Z"), totalChecks: 10, upChecks: 10 }];
    // 06:00 now: today's 10 checks are all inside the window, so this is (9 + 10) / 20.
    const at6 = new Date("2026-11-10T06:00:00Z");
    expect(uptimePercent([], [...yesterday, ...today], new Date("2026-11-09T00:00:00Z"), at6)).toBe(95);
  });

  it("combines rollups and raw checks", () => {
    const from = new Date("2026-11-01T00:00:00Z");
    const to = new Date("2026-11-03T00:00:00Z");
    const rollups = [{ day: new Date("2026-11-01T00:00:00Z"), totalChecks: 3, upChecks: 3 }];
    expect(uptimePercent([c("2026-11-02T01:00:00Z", false)], rollups, from, to)).toBe(75);
  });

  it("ignores rollups outside the window and empty rollups", () => {
    const rollups = [
      { day: new Date("2026-10-01T00:00:00Z"), totalChecks: 10, upChecks: 0 },
      { day: new Date("2026-11-10T00:00:00Z"), totalChecks: 0, upChecks: 0 },
    ];
    expect(uptimePercent([c("2026-11-10T10:00:00Z", true)], rollups, from24h, now)).toBe(100);
  });
});

describe("dailyBars", () => {
  it("returns N days oldest first, today partial, null for days without data", () => {
    const now = new Date("2026-11-10T06:00:00Z");
    const bars = dailyBars(
      [c("2026-11-10T01:00:00Z", true), c("2026-11-10T02:00:00Z", false)],
      [{ day: new Date("2026-11-08T00:00:00Z"), totalChecks: 4, upChecks: 3 }],
      3,
      now,
    );
    expect(bars.map((b) => b.day.toISOString().slice(0, 10))).toEqual(["2026-11-08", "2026-11-09", "2026-11-10"]);
    expect(bars.map((b) => b.uptime)).toEqual([75, null, 50]);
  });
});

describe("formatUptime", () => {
  it("never rounds a failure up to 100%", () => {
    expect(formatUptime(99.999)).toBe("99.99%");
    expect(formatUptime(100)).toBe("100%");
    expect(formatUptime(null)).toBe("—");
  });
});
