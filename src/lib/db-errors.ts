/** Prisma's unique-constraint error, without importing the runtime error classes into client bundles. */
export function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";
}
