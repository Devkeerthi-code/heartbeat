import { describe, expect, it } from "vitest";
import { isPrivateAddress, validateMonitorUrl } from "./ssrf";

describe("isPrivateAddress", () => {
  it.each([
    "127.0.0.1", "10.0.0.5", "10.255.255.255", "172.16.0.1", "172.31.255.254", "192.168.1.1",
    "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255",
    "::1", "::", "fe80::1", "fc00::1", "fd00:ec2::254", "::ffff:127.0.0.1", "::ffff:169.254.169.254",
    "::ffff:7f00:1", "64:ff9b::a00:1",
  ])("blocks %s", (ip) => expect(isPrivateAddress(ip)).toBe(true));

  it.each(["8.8.8.8", "1.1.1.1", "172.32.0.1", "76.76.21.21", "2606:4700:4700::1111", "::ffff:8.8.8.8"])(
    "allows %s",
    (ip) => expect(isPrivateAddress(ip)).toBe(false),
  );

  it("treats non-IP strings as unsafe", () => expect(isPrivateAddress("not-an-ip")).toBe(true));
});

describe("validateMonitorUrl", () => {
  const blocked = (url: string) => validateMonitorUrl(url).ok === false;

  it.each([
    "http://localhost:3000",
    "http://LOCALHOST",
    "http://127.0.0.1",
    "http://2130706433", // decimal form of 127.0.0.1
    "http://0x7f.0.0.1",
    "http://10.0.0.1/admin",
    "http://192.168.0.10",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://169.254.169.254/latest/meta-data/",
    "http://metadata.google.internal/computeMetadata/v1/",
    "http://printer.local",
    "http://db.internal",
    "http://intranet",
    "ftp://example.com",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "https://user:pass@example.com",
    "https://example.com:22",
    "not a url",
  ])("rejects %s", (url) => expect(blocked(url)).toBe(true));

  it.each(["https://example.com", "http://example.com:8080/health", "https://my-app.vercel.app/api/health?x=1"])(
    "accepts %s",
    (url) => expect(validateMonitorUrl(url).ok).toBe(true),
  );

  it("gives a specific reason for cloud metadata", () => {
    const r = validateMonitorUrl("http://169.254.169.254/");
    expect(r.ok === false && r.reason).toMatch(/metadata/i);
  });
});
