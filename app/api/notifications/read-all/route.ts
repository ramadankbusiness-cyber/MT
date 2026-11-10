import { withApiErrorHandling } from "@/lib/api-error-handler";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";

async function POSTInternal() {
  const access = await requirePermission("notifications.manage.own");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  await prisma.notificationRecipient.updateMany({
    where: { userId: access.user.id, readAt: null, deliveredAt: { not: null } },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}

export const POST = withApiErrorHandling(POSTInternal, "/api/notifications/read-all");
