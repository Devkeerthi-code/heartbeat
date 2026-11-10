import { describe, expect, it } from "vitest";
import { monitorSchema, projectSchema, signupSchema } from "./validation";

const validMonitor = {
  name: "Portfolio",
  url: "https://example.com",
  method: "GET",
  expectedStatus: "200",
  keyword: "",
  timeoutSeconds: "10",
  intervalMinutes: "5",
  checkSsl: "on",
};

describe("monitorSchema (server-side validation)", () => {
  it("coerces form strings into a clean monitor", () => {
    expect(monitorSchema.parse(validMonitor)).toEqual({
      name: "Portfolio",
      url: "https://example.com",
      method: "GET",
      expectedStatus: 200,
      keyword: null,
      timeoutSeconds: 10,
      intervalMinutes: 5,
      checkSsl: true,
    });
  });

  it("rejects private addresses even if the client skipped its own check", () => {
    const r = monitorSchema.safeParse({ ...validMonitor, url: "http://192.168.1.1" });
    expect(r.success).toBe(false);
  });

  it.each(["1", "15", "120"])("rejects interval %s", (intervalMinutes) => {
    expect(monitorSchema.safeParse({ ...validMonitor, intervalMinutes }).success).toBe(false);
  });

  it("rejects out-of-range timeouts and status codes", () => {
    expect(monitorSchema.safeParse({ ...validMonitor, timeoutSeconds: "31" }).success).toBe(false);
    expect(monitorSchema.safeParse({ ...validMonitor, expectedStatus: "700" }).success).toBe(false);
  });

  it("treats a missing checkbox as off", () => {
    const { checkSsl: _ignored, ...rest } = validMonitor;
    expect(monitorSchema.parse(rest).checkSsl).toBe(false);
  });
});

describe("other schemas", () => {
  it("normalises email and enforces bcrypt's 72-byte password limit", () => {
    expect(signupSchema.parse({ email: "  Me@Example.COM ", password: "longenough" }).email).toBe("me@example.com");
    expect(signupSchema.safeParse({ email: "me@example.com", password: "x".repeat(73) }).success).toBe(false);
  });

  it("only allows URL-safe status page slugs", () => {
    expect(projectSchema.safeParse({ name: "Club", slug: "coding-club" }).success).toBe(true);
    expect(projectSchema.safeParse({ name: "Club", slug: "Coding Club!" }).success).toBe(false);
    expect(projectSchema.safeParse({ name: "Club", slug: "a--b" }).success).toBe(false);
  });
});
