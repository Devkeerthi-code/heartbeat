import dns, { type LookupAddress, type LookupOptions } from "node:dns";
import http from "node:http";
import https from "node:https";
import type { TLSSocket } from "node:tls";
import { isPrivateAddress, validateMonitorUrl } from "./ssrf";

export type CheckConfig = {
  url: string;
  method: "GET" | "HEAD" | "POST";
  expectedStatus: number;
  keyword: string | null;
  timeoutMs: number;
};

export type CheckResult = {
  ok: boolean;
  statusCode: number | null;
  responseMs: number;
  error: string | null;
  sslExpiresAt: Date | null;
};

const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 1_000_000;
const USER_AGENT = "HeartbeatUptimeBot/1.0 (+https://github.com/Devkeerthi-code/heartbeat)";

class BlockedAddressError extends Error {
  code = "EBLOCKED";
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

/**
 * DNS lookup used for the actual socket connection. Validating here (not before the request)
 * means the address we check is the address we connect to, which defeats DNS rebinding.
 */
function guardedLookup(hostname: string, options: LookupOptions, callback: LookupCallback): void {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, []);
    const list = addresses as LookupAddress[];
    if (list.length === 0 || list.some((a) => isPrivateAddress(a.address))) {
      return callback(new BlockedAddressError(`${hostname} resolves to a private address`), []);
    }
    if (options.all) return callback(null, list);
    const first = list[0] as LookupAddress;
    callback(null, first.address, first.family);
  });
}

type HopResult = { statusCode: number; location: string | null; body: string; certValidTo: Date | null };

function requestHop(url: URL, method: string, readBody: boolean, signal: AbortSignal): Promise<HopResult> {
  const lib = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = lib.request(
      url,
      { method, signal, agent: false, lookup: guardedLookup, headers: { "user-agent": USER_AGENT, accept: "*/*" } },
      (res) => {
        const socket = res.socket as TLSSocket;
        const cert = typeof socket.getPeerCertificate === "function" ? socket.getPeerCertificate() : null;
        const certValidTo = cert?.valid_to ? new Date(cert.valid_to) : null;
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          if (!readBody || size >= MAX_BODY_BYTES) return;
          chunks.push(chunk);
          size += chunk.length;
        });
        res.on("end", () =>
          resolve({
            statusCode: res.statusCode ?? 0,
            location: typeof res.headers.location === "string" ? res.headers.location : null,
            body: Buffer.concat(chunks).toString("utf8"),
            certValidTo,
          }),
        );
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.end();
  });
}

export function describeError(err: unknown, timeoutMs: number): string {
  const e = err as NodeJS.ErrnoException & { name?: string };
  if (e?.name === "AbortError" || e?.code === "ABORT_ERR") return `Timed out after ${timeoutMs / 1000}s`;
  switch (e?.code) {
    case "EBLOCKED":
      return "Blocked: hostname resolves to a private address";
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return "DNS lookup failed";
    case "ECONNREFUSED":
      return "Connection refused";
    case "ECONNRESET":
      return "Connection reset by server";
    case "CERT_HAS_EXPIRED":
      return "SSL certificate has expired";
    case "ERR_TLS_CERT_ALTNAME_INVALID":
      return "SSL certificate doesn't match the hostname";
    case "DEPTH_ZERO_SELF_SIGNED_CERT":
    case "SELF_SIGNED_CERT_IN_CHAIN":
      return "SSL certificate is self-signed";
    default:
      return e?.message ? e.message.slice(0, 200) : "Request failed";
  }
}

const isRedirect = (status: number) => status >= 300 && status < 400;

/** Runs one check: follows up to 5 redirects (each re-validated), enforces a hard overall timeout. */
export async function runHttpCheck(config: CheckConfig): Promise<CheckResult> {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  const elapsed = () => Math.round(performance.now() - started);
  const readBody = Boolean(config.keyword) && config.method !== "HEAD";
  const followRedirects = !isRedirect(config.expectedStatus);
  let sslExpiresAt: Date | null = null;

  try {
    let target = validateMonitorUrl(config.url);
    let method: string = config.method;
    for (let hop = 0; ; hop++) {
      if (!target.ok) return { ok: false, statusCode: null, responseMs: elapsed(), error: target.reason, sslExpiresAt };
      const res = await requestHop(target.url, method, readBody, controller.signal);
      if (hop === 0) sslExpiresAt = res.certValidTo;

      if (followRedirects && isRedirect(res.statusCode) && res.location) {
        if (hop >= MAX_REDIRECTS) {
          return { ok: false, statusCode: res.statusCode, responseMs: elapsed(), error: "Too many redirects", sslExpiresAt };
        }
        target = validateMonitorUrl(new URL(res.location, target.url).toString());
        if (res.statusCode === 303) method = "GET";
        continue;
      }

      const responseMs = elapsed();
      if (res.statusCode !== config.expectedStatus) {
        return {
          ok: false,
          statusCode: res.statusCode,
          responseMs,
          error: `Expected ${config.expectedStatus}, got ${res.statusCode}`,
          sslExpiresAt,
        };
      }
      if (readBody && config.keyword && !res.body.toLowerCase().includes(config.keyword.toLowerCase())) {
        return { ok: false, statusCode: res.statusCode, responseMs, error: `Keyword "${config.keyword}" not found`, sslExpiresAt };
      }
      return { ok: true, statusCode: res.statusCode, responseMs, error: null, sslExpiresAt };
    }
  } catch (err) {
    return { ok: false, statusCode: null, responseMs: elapsed(), error: describeError(err, config.timeoutMs), sslExpiresAt };
  } finally {
    clearTimeout(timer);
  }
}
