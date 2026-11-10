import { createHash, timingSafeEqual } from "node:crypto";

const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * Accepts "Authorization: Bearer <CRON_SECRET>" (what Vercel Cron and cron-job.org send).
 * Hashing both sides first gives equal-length buffers, so the comparison is constant-time
 * and doesn't leak the secret's length.
 */
export function isAuthorizedCron(authorizationHeader: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 32 || !authorizationHeader) return false;
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) return false;
  return timingSafeEqual(digest(match[1].trim()), digest(secret));
}
