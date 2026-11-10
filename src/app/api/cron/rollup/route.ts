import { cronHandler } from "@/lib/cron-route";
import { runRollup } from "@/lib/monitoring/rollup-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const handler = cronHandler(() => runRollup());
export { handler as GET, handler as POST };
