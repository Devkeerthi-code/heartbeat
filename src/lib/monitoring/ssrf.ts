import { isIP } from "node:net";

const BLOCKED_HOST_SUFFIXES = [".local", ".internal", ".localhost", ".lan", ".home.arpa"];
const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal", "metadata"]);

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function inCidr(ip: string, base: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

const PRIVATE_V4: Array<[string, number]> = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // link-local, includes 169.254.169.254 cloud metadata
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
];

function isPrivateV4(ip: string): boolean {
  return PRIVATE_V4.some(([base, bits]) => inCidr(ip, base, bits));
}

/** Expands "::ffff:1.2.3.4" style and compressed IPv6 into 8 hextets. */
function expandV6(ip: string): number[] | null {
  let address = ip.toLowerCase().split("%")[0] ?? "";
  const v4Tail = address.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Tail?.[1]) {
    const n = ipv4ToInt(v4Tail[1]);
    address = address.replace(v4Tail[1], `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`);
  }
  const [head = "", tail] = address.split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = tail ? tail.split(":") : [];
  const fill = tail === undefined ? 0 : 8 - headParts.length - tailParts.length;
  if (fill < 0) return null;
  const parts = [...headParts, ...Array<string>(fill).fill("0"), ...tailParts].map((p) => parseInt(p, 16));
  return parts.length === 8 && parts.every((p) => Number.isInteger(p) && p >= 0 && p <= 0xffff) ? parts : null;
}

function isPrivateV6(ip: string): boolean {
  const h = expandV6(ip);
  if (!h) return true; // unparseable: refuse rather than guess
  const [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, last = 0] = h;
  const allZeroPrefix = a === 0 && b === 0 && c === 0 && d === 0 && e === 0;
  if (allZeroPrefix && f === 0 && g === 0 && (last === 0 || last === 1)) return true; // :: and ::1
  if (allZeroPrefix && (f === 0xffff || f === 0)) {
    return isPrivateV4(`${g >> 8}.${g & 0xff}.${last >> 8}.${last & 0xff}`); // IPv4-mapped / compatible
  }
  if (a === 0x64 && b === 0xff9b) return isPrivateV4(`${g >> 8}.${g & 0xff}.${last >> 8}.${last & 0xff}`); // NAT64
  if ((a & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local (incl. AWS fd00:ec2::254)
  if ((a & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((a & 0xff00) === 0xff00) return true; // multicast
  if (a === 0x2001 && b === 0x0db8) return true; // documentation
  return false;
}

/** True for any address a monitor must never be allowed to reach. */
export function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateV4(ip);
  if (family === 6) return isPrivateV6(ip);
  return true;
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return BLOCKED_HOSTNAMES.has(host) || BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s));
}

/**
 * Static validation of a monitor URL (scheme, credentials, literal IPs, internal hostnames).
 * DNS answers are validated separately at connect time, which also defeats DNS rebinding.
 */
export function validateMonitorUrl(raw: string): UrlCheck {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "That isn't a valid URL. Include https://" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "Only http:// and https:// URLs can be monitored." };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "Remove the username/password from the URL." };
  }
  if (url.port && !["80", "443", "8080", "8443"].includes(url.port)) {
    return { ok: false, reason: "Only ports 80, 443, 8080 and 8443 are allowed." };
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "169.254.169.254" || host.toLowerCase().startsWith("metadata")) {
    return { ok: false, reason: "Cloud metadata addresses can't be monitored." };
  }
  if (isIP(host) ? isPrivateAddress(host) : isBlockedHostname(host)) {
    return { ok: false, reason: "Private and internal addresses (localhost, 10.x, 192.168.x…) can't be monitored." };
  }
  if (!isIP(host) && !host.includes(".")) {
    return { ok: false, reason: "Use a public domain name, e.g. example.com." };
  }
  return { ok: true, url };
}
