import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCron } from "./cron-auth";

/** Wraps a cron job in CRON_SECRET auth and turns failures into a JSON 500 (so cron-job.org flags them). */
export function cronHandler(job: () => Promise<unknown>) {
  return async function handler(request: NextRequest): Promise<NextResponse> {
    if (!isAuthorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const started = Date.now();
    try {
      const result = await job();
      return NextResponse.json({ ok: true, ms: Date.now() - started, result });
    } catch (err) {
      console.error("[cron] job failed", err);
      return NextResponse.json({ ok: false, error: "Job failed, see server logs" }, { status: 500 });
    }
  };
}
