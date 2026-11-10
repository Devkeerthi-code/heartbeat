"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db-errors";
import { fieldErrors, projectSchema } from "@/lib/validation";
import { formValues, type ActionState } from "./types";

const MAX_PROJECTS_PER_USER = 5;

export async function updateProjectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const values = formValues(formData);
  const projectId = String(formData.get("projectId") ?? "");
  const project = await db.project.findFirst({ where: { id: projectId, ownerId: user.id }, select: { id: true, slug: true, note: true } });
  if (!project) return { message: "Project not found.", values };

  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const { name, slug, note } = parsed.data;
  try {
    await db.project.update({
      where: { id: project.id },
      data: { name, slug, note, ...(note !== project.note ? { noteUpdatedAt: note ? new Date() : null } : {}) },
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { errors: { slug: "That address is taken. Try another." }, values };
    throw err;
  }
  revalidatePath(`/status/${project.slug}`);
  revalidatePath(`/status/${slug}`);
  revalidatePath("/settings");
  return { ok: true, message: "Status page updated.", values };
}

export async function createProjectAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim().slice(0, 60) || "New project";
  const count = await db.project.count({ where: { ownerId: user.id } });
  if (count >= MAX_PROJECTS_PER_USER) redirect("/settings?error=project-limit");
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "project";
  const project = await db.project.create({ data: { ownerId: user.id, name, slug: `${base}-${randomBytes(2).toString("hex")}` } });
  revalidatePath("/dashboard");
  redirect(`/dashboard?project=${project.id}`);
}
