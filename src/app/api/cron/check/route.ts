import { cronHandler } from "@/lib/cron-route";
import { runDueChecks } from "@/lib/monitoring/run-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Runs stop starting new checks after 20s; in-flight checks time out by 30s at most.
export const maxDuration = 60;

const handler = cronHandler(runDueChecks);
export { handler as GET, handler as POST };
