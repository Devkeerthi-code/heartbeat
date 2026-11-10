import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthShell command="heartbeat signup">
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
