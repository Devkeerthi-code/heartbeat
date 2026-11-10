import { describe, expect, it } from "vitest";
import { escapeHtml, formatDuration } from "./format";

describe("formatDuration", () => {
  it.each([
    [0, "0s"],
    [45, "45s"],
    [60, "1m"],
    [1050, "17m 30s"],
    [3600, "1h"],
    [7260, "2h 1m"],
    [90_000, "1d 1h"],
  ])("%i seconds → %s", (sec, out) => expect(formatDuration(sec)).toBe(out));
});

describe("escapeHtml", () => {
  it("escapes markup in user-supplied monitor names", () => {
    expect(escapeHtml(`<img src=x onerror="a">'`)).toBe("&lt;img src=x onerror=&quot;a&quot;&gt;&#39;");
  });
});
