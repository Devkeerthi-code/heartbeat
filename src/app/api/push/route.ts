import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { track } from "@/lib/usage";
import { pushSubscriptionSchema } from "@/lib/validation";

export const runtime = "nodejs";

const MAX_DEVICES = 10;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const parsed = pushSubscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  const { endpoint, keys } = parsed.data;
  const count = await db.pushSubscription.count({ where: { userId: user.id } });
  if (count >= MAX_DEVICES) return NextResponse.json({ error: `Up to ${MAX_DEVICES} devices` }, { status: 409 });
  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
  });
  track("push_enabled", user.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint !== "string") return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  await db.pushSubscription.deleteMany({ where: { userId: user.id, endpoint: body.endpoint } });
  return NextResponse.json({ ok: true });
}
