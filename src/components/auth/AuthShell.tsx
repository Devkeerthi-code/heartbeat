import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Brand } from "@/components/ui/Brand";
import { Prompt } from "@/components/ui/Prompt";
import { getCurrentUser } from "@/lib/auth/session";

/** Shared frame for sign-in and sign-up. Signed-in visitors go straight to the dashboard. */
export async function AuthShell({ command, children }: { command: string; children: ReactNode }) {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr]">
      <header className="flex items-center justify-between border-b border-line px-4 py-3 md:px-8">
        <Brand />
      </header>
      <main id="main" className="flex flex-col items-center justify-center gap-2 px-4 py-10">
        <div className="w-full max-w-[420px]">
          <Prompt user="guest">{command}</Prompt>
        </div>
        {children}
      </main>
    </div>
  );
}
