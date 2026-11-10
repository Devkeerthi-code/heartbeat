import { describe, expect, it } from "vitest";
import { incidentDurationSec, nextState, type StateInput } from "./state";

const run = (start: StateInput, results: boolean[]) => {
  let s = start;
  return results.map((ok) => {
    const t = nextState(s, ok);
    s = { status: t.status, consecutiveFailures: t.consecutiveFailures };
    return t;
  });
};

describe("2-failure rule", () => {
  it("a single failure does not mark DOWN or open an incident", () => {
    const [t] = run({ status: "UP", consecutiveFailures: 0 }, [false]);
    expect(t).toMatchObject({ status: "UP", consecutiveFailures: 1, openIncident: false });
  });

  it("the second consecutive failure marks DOWN and opens exactly one incident", () => {
    const ts = run({ status: "UP", consecutiveFailures: 0 }, [false, false, false, false]);
    expect(ts.map((t) => t.status)).toEqual(["UP", "DOWN", "DOWN", "DOWN"]);
    expect(ts.filter((t) => t.openIncident)).toHaveLength(1);
    expect(ts[1]?.openIncident).toBe(true);
  });

  it("fail, recover, fail does not trigger (failures must be consecutive)", () => {
    const ts = run({ status: "UP", consecutiveFailures: 0 }, [false, true, false]);
    expect(ts.some((t) => t.openIncident)).toBe(false);
    expect(ts.at(-1)?.status).toBe("UP");
  });

  it("a brand-new monitor that fails twice goes from PENDING to DOWN", () => {
    const ts = run({ status: "PENDING", consecutiveFailures: 0 }, [false, false]);
    expect(ts[0]?.status).toBe("PENDING");
    expect(ts[1]).toMatchObject({ status: "DOWN", openIncident: true });
  });
});

describe("recovery", () => {
  it("first success after DOWN closes the incident and resets the counter", () => {
    const [t] = run({ status: "DOWN", consecutiveFailures: 7 }, [true]);
    expect(t).toEqual({ status: "UP", consecutiveFailures: 0, openIncident: false, closeIncident: true });
  });

  it("success while already UP never closes anything", () => {
    const [t] = run({ status: "UP", consecutiveFailures: 1 }, [true]);
    expect(t?.closeIncident).toBe(false);
  });

  it("records incident duration in whole seconds", () => {
    expect(incidentDurationSec(new Date("2026-11-10T10:00:00Z"), new Date("2026-11-10T10:17:30.400Z"))).toBe(1050);
    expect(incidentDurationSec(new Date("2026-11-10T10:00:00Z"), new Date("2026-11-10T09:00:00Z"))).toBe(0);
  });
});
