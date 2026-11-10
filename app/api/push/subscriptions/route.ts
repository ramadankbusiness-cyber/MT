import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { pushSubscriptionSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const access = await requirePermission("notifications.manage.own");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body: unknown = await request.json().catch(() => null);
  const parsed = pushSubscriptionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "The browser push subscription is invalid." }, { status: 400 });
  const subscription = await prisma.pushSubscription.upsert({
    where: { endpoint: parsed.data.endpoint },
    create: {
      userId: access.user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
    },
    update: {
      userId: access.user.id,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
    },
    select: { id: true },
  });
  return NextResponse.json({ subscriptionId: subscription.id }, { status: 201 });
}

export async function DELETE(request: Request) {
  const access = await requirePermission("notifications.manage.own");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !("endpoint" in body) || typeof body.endpoint !== "string") {
    return NextResponse.json({ error: "Choose a valid push subscription." }, { status: 400 });
  }
  await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint, userId: access.user.id } });
  return NextResponse.json({ ok: true });
}
