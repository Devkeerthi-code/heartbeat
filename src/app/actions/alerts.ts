"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { requireUser } from "@/lib/auth/guard";
import { rateLimit } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { alertPrefsSchema } from "@/lib/validation";
import type { ActionState } from "./types";

export async function updateAlertPrefsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = alertPrefsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Couldn't read those settings." };
  await db.user.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath("/settings");
  return { ok: true, message: "Alert settings saved." };
}

export async function sendTestEmailAction(): Promise<ActionState> {
  const user = await requireUser();
  if (!(await rateLimit(`testmail:${user.id}`, 3, 60 * 60_000))) return { message: "Max 3 test emails an hour." };
  const { RESEND_API_KEY, EMAIL_FROM } = env();
  if (!RESEND_API_KEY) return { message: "Email isn't configured on this server (RESEND_API_KEY missing)." };
  const { error } = await new Resend(RESEND_API_KEY).emails.send({
    from: EMAIL_FROM,
    to: user.email,
    subject: "[TEST] Heartbeat alerts are working",
    text: "This is a test alert from Heartbeat. Real alerts look like this and arrive when a monitor fails 2 checks in a row.",
  });
  if (error) return { message: `Email provider said: ${error.message}` };
  return { ok: true, message: `Test email sent to ${user.email}.` };
}
