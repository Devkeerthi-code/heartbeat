import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "./session";

/** For pages and actions that need a signed-in user; bounces to sign-in otherwise. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
