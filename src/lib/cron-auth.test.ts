import { describe, expect, it } from "vitest";
import { isAuthorizedCron } from "./cron-auth";

const secret = "a".repeat(64);

describe("CRON_SECRET enforcement", () => {
  it("accepts the exact bearer token", () => expect(isAuthorizedCron(`Bearer ${secret}`, secret)).toBe(true));

  it("is case-insensitive on the scheme only", () => expect(isAuthorizedCron(`bearer ${secret}`, secret)).toBe(true));

  it.each([
    ["missing header", null],
    ["empty header", ""],
    ["wrong secret", `Bearer ${"b".repeat(64)}`],
    ["prefix of the secret", `Bearer ${secret.slice(0, 63)}`],
    ["secret without scheme", secret],
    ["basic auth", `Basic ${secret}`],
  ])("rejects %s", (_label, header) => expect(isAuthorizedCron(header, secret)).toBe(false));

  it("rejects everything when the server secret is unset or too short", () => {
    expect(isAuthorizedCron("Bearer ", undefined)).toBe(false);
    expect(isAuthorizedCron("Bearer short", "short")).toBe(false);
  });
});
