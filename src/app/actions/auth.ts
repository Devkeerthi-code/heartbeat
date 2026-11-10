"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db-errors";
import { DUMMY_HASH, hashPassword, verifyPassword } from "@/lib/auth/password";
import { clientKey, rateLimit } from "@/lib/auth/rate-limit";
import { createSession, destroySession } from "@/lib/auth/session";
import { track } from "@/lib/usage";
import { fieldErrors, loginSchema, signupSchema } from "@/lib/validation";
import { formValues, type ActionState } from "./types";

const TOO_MANY = "Too many attempts. Wait a few minutes and try again.";

function slugFromEmail(email: string): string {
  const base = (email.split("@")[0] ?? "my")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return `${base || "my"}-sites-${randomBytes(2).toString("hex")}`;
}

export async function signupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  if (!(await rateLimit(`signup:${await clientKey()}`, 5, 60 * 60_000))) return { message: TOO_MANY, values };

  const { email, password } = parsed.data;
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    return { errors: { email: "That email already has an account. Sign in instead." }, values };
  }
  const passwordHash = await hashPassword(password);
  const user = await db.user
    .create({ data: { email, passwordHash, projects: { create: { name: "My sites", slug: slugFromEmail(email) } } } })
    .catch((err: unknown) => {
      if (isUniqueViolation(err)) return null; // double-submit or a concurrent signup with the same email
      throw err;
    });
  if (!user) return { errors: { email: "That email already has an account. Sign in instead." }, values };
  await createSession(user.id);
  track("signup", user.id);
  redirect("/dashboard?welcome=1");
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const { email, password } = parsed.data;
  const key = await clientKey();
  const allowed = (await rateLimit(`login:${key}`, 20, 15 * 60_000)) && (await rateLimit(`login:${email}`, 8, 15 * 60_000));
  if (!allowed) return { message: TOO_MANY, values };

  const user = await db.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  // Always run bcrypt so a missing account takes as long as a wrong password.
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) return { message: "Email or password is incorrect.", values };

  await createSession(user.id);
  track("login", user.id);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
