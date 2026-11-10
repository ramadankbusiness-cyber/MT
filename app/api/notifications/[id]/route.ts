import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requirePermission("notifications.manage.own");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !("action" in body) || !["read", "unread", "delete"].includes(String(body.action))) {
    return NextResponse.json({ error: "Choose a valid notification action." }, { status: 400 });
  }
  const { id } = await context.params;
  const action = body.action;
  if (action === "delete") {
    const result = await prisma.notificationRecipient.deleteMany({ where: { notificationId: id, userId: access.user.id, deliveredAt: { not: null } } });
    if (!result.count) return NextResponse.json({ error: "Notification not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  }
  const result = await prisma.notificationRecipient.updateMany({
    where: { notificationId: id, userId: access.user.id, deliveredAt: { not: null } },
    data: { readAt: action === "read" ? new Date() : null },
  });
  if (!result.count) return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
