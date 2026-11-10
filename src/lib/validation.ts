import { z } from "zod";
import { validateMonitorUrl } from "@/lib/monitoring/ssrf";
import { ALLOWED_INTERVALS } from "@/lib/monitoring/schedule";

const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);

export const signupSchema = z.object({
  email,
  password: z.string().min(8, "Use at least 8 characters").max(72, "Use 72 characters or fewer"),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(72),
});

const checkbox = z.union([z.literal("on"), z.literal("true"), z.literal("")]).optional().transform((v) => v === "on" || v === "true");

export const monitorSchema = z.object({
  name: z.string().trim().min(1, "Give it a name you'll recognise in an alert").max(60, "Keep the name under 60 characters"),
  url: z
    .string()
    .trim()
    .max(2048, "That URL is too long")
    .superRefine((value, ctx) => {
      const r = validateMonitorUrl(value);
      if (!r.ok) ctx.addIssue({ code: "custom", message: r.reason });
    }),
  method: z.enum(["GET", "HEAD", "POST"]),
  expectedStatus: z.coerce.number().int().min(100, "Status codes are 100–599").max(599, "Status codes are 100–599"),
  keyword: z
    .string()
    .trim()
    .max(200, "Keep the keyword under 200 characters")
    .optional()
    .transform((v) => (v ? v : null)),
  timeoutSeconds: z.coerce.number().int().min(1, "At least 1 second").max(30, "At most 30 seconds"),
  intervalMinutes: z.coerce
    .number()
    .refine((n): n is (typeof ALLOWED_INTERVALS)[number] => (ALLOWED_INTERVALS as readonly number[]).includes(n), "Choose 5, 10, 30 or 60 minutes"),
  checkSsl: checkbox,
});

export type MonitorInput = z.infer<typeof monitorSchema>;

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Name your project").max(60),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "At least 3 characters")
    .max(40, "At most 40 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and single dashes only"),
  note: z
    .string()
    .trim()
    .max(280, "Keep the note under 280 characters")
    .optional()
    .transform((v) => (v ? v : null)),
});

export const alertPrefsSchema = z.object({ emailAlerts: checkbox, pushAlerts: checkbox });

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(1000).startsWith("https://"),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** Field → first message, the shape forms render inline. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
