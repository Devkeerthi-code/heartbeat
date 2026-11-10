import { after } from "next/server";
import { db } from "@/lib/db";

export type UsageType = "signup" | "login" | "monitor_created" | "status_page_view" | "push_enabled" | "check_now";

/**
 * Privacy-respecting usage counter (event name + optional user id, nothing else).
 * Written after the response is sent, so it never slows down or fails the user's action.
 */
export function track(type: UsageType, userId?: string): void {
  after(async () => {
    await db.usageEvent.create({ data: { type, userId: userId ?? null } }).catch(() => undefined);
  });
}
