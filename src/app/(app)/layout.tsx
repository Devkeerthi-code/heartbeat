import type { ReactNode } from "react";
import { AppNav } from "@/components/shell/AppNav";
import { Shortcuts } from "@/components/shell/Shortcuts";
import { requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const downCount = await db.monitor.count({ where: { project: { ownerId: user.id }, status: "DOWN", paused: false } });
  return (
    <div className="md:grid md:min-h-dvh md:grid-cols-[216px_minmax(0,1fr)]">
      <AppNav email={user.email} downCount={downCount} />
      <main id="main" tabIndex={-1} className="min-w-0 px-4 pt-4 pb-24 outline-none md:px-8 md:pt-6 md:pb-16">
        <div className="mx-auto max-w-[1200px]">{children}</div>
      </main>
      <Shortcuts />
    </div>
  );
}
