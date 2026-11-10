import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  CRON_SECRET: z.string().min(32, "CRON_SECRET must be at least 32 characters"),
  SESSION_SECRET: z.string().min(32),
  APP_URL: z.string().url().default("http://localhost:3000"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Heartbeat <onboarding@resend.dev>"),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

/** Parsed lazily so `next build` works without secrets; fails loudly on first real use. */
export function env(): Env {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}
