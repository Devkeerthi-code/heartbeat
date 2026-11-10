import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthShell command="heartbeat login">
      <AuthForm mode="login" />
    </AuthShell>
  );
}
