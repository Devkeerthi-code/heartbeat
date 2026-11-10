import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export type Window = { count: number; resetAt: Date };

/** Pure fixed-window step: returns the new window and whether this attempt is allowed. */
export function stepWindow(current: Window | null, now: Date, limit: number, windowMs: number): { window: Window; allowed: boolean } {
  if (!current || current.resetAt <= now) {
    return { window: { count: 1, resetAt: new Date(now.getTime() + windowMs) }, allowed: true };
  }
  const window = { count: current.count + 1, resetAt: current.resetAt };
  return { window, allowed: window.count <= limit };
}

/** Requester fingerprint for rate limiting only: an HMAC of the IP, never stored in plain form. */
export async function clientKey(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHmac("sha256", env().SESSION_SECRET).update(ip).digest("hex").slice(0, 32);
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = new Date();
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Window[]>`SELECT count, "resetAt" FROM "RateLimit" WHERE key = ${key} FOR UPDATE`;
    const { window, allowed } = stepWindow(rows[0] ?? null, now, limit, windowMs);
    await tx.rateLimit.upsert({ where: { key }, create: { key, ...window }, update: window });
    return allowed;
  });
}
