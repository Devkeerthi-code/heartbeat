import { describe, expect, it } from "vitest";
import { stepWindow } from "./rate-limit";

describe("fixed-window rate limit", () => {
  const now = new Date("2026-11-10T12:00:00Z");

  it("allows up to the limit, then blocks until the window resets", () => {
    let w = null;
    const allowed: boolean[] = [];
    for (let i = 0; i < 6; i++) {
      const r = stepWindow(w, now, 5, 60_000);
      w = r.window;
      allowed.push(r.allowed);
    }
    expect(allowed).toEqual([true, true, true, true, true, false]);
    expect(stepWindow(w, new Date(now.getTime() + 60_000), 5, 60_000).allowed).toBe(true);
  });
});
