import { withApiErrorHandling } from "@/lib/api-error-handler";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { notificationSchema } from "@/lib/schemas";
import { countUnreadForUser, dispatchPushNotification, isNotificationType } from "@/lib/notification-delivery";
import { writeAuditLog } from "@/lib/audit";
import { isClubCommitteeId } from "@/lib/committees";

async function GETInternal(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("sent") === "true") {
    const adminAccess = await requirePermission("notifications.manage");
    const senderAccess = "error" in adminAccess ? await requirePermission("notifications.send") : adminAccess;
    if ("error" in senderAccess) return NextResponse.json({ error: senderAccess.error }, { status: senderAccess.status });
    const where = "error" in adminAccess ? { createdById: senderAccess.user.id } : {};
    const sentItems = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { _count: { select: { recipients: true } } },
    });
    const ids = sentItems.map((item) => item.id);
    const [delivered, read] = ids.length ? await Promise.all([
      prisma.notificationRecipient.groupBy({
        by: ["notificationId"],
        where: { notificationId: { in: ids }, deliveredAt: { not: null } },
        _count: { _all: true },
      }),
      prisma.notificationRecipient.groupBy({
        by: ["notificationId"],
        where: { notificationId: { in: ids }, readAt: { not: null } },
        _count: { _all: true },
      }),
    ]) : [[], []];
    return NextResponse.json({
      notifications: sentItems.map((item) => ({
        ...item,
        deliveredCount: delivered.find((entry) => entry.notificationId === item.id)?._count._all ?? 0,
        readCount: read.find((entry) => entry.notificationId === item.id)?._count._all ?? 0,
      })),
    });
  }
  const access = await requirePermission("notifications.read");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const unreadOnly = url.searchParams.get("unread") === "true";
  const requestedType = url.searchParams.get("type");
  if (requestedType && !isNotificationType(requestedType)) return NextResponse.json({ error: "Unknown notification type." }, { status: 400 });
  const type = requestedType && isNotificationType(requestedType) ? requestedType : undefined;
  const rows = await prisma.notificationRecipient.findMany({
    where: {
      userId: access.user.id,
      deliveredAt: { not: null },
      ...(unreadOnly ? { readAt: null } : {}),
      ...(type ? { notification: { type } } : {}),
    },
    include: { notification: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const hidden = await prisma.notificationPreference.findMany({ where: { userId: access.user.id, inApp: false }, select: { type: true } });
  const hiddenTypes = new Set(hidden.map((preference) => preference.type));
  const notifications = rows.filter((row) => !hiddenTypes.has(row.notification.type)).slice(0, 50).map((row) => ({
    ...row,
    notification: {
      ...row.notification,
      title: access.user.preferredLanguage === "ar" ? row.notification.titleAr || row.notification.title : row.notification.title,
      message: access.user.preferredLanguage === "ar" ? row.notification.messageAr || row.notification.message : row.notification.message,
    },
  }));
  const unreadCount = await countUnreadForUser(access.user.id);
  return NextResponse.json({ notifications, unreadCount });
}

async function POSTInternal(request: Request) {
  const access = await requirePermission("notifications.send");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body: unknown = await request.json().catch(() => null);
  const parsed = notificationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check the notification details and audience." }, { status: 400 });
  const input = parsed.data;
  const canSendAnyAudience = await requirePermission("notifications.send.anyAudience");
  if ("error" in canSendAnyAudience) {
    if (input.audience !== "COMMITTEE" || !access.user.committeeId || input.committeeId !== access.user.committeeId) {
      return NextResponse.json({ error: "Leaders may only notify their own committee." }, { status: 403 });
    }
  } else if (input.audience === "ROLE" && !input.audienceRole) {
    return NextResponse.json({ error: "Choose a role for this audience." }, { status: 400 });
  } else if (input.audience === "COMMITTEE" && !input.committeeId) {
    return NextResponse.json({ error: "Choose a committee for this audience." }, { status: 400 });
  } else if (input.audience === "USERS" && !input.userIds?.length) {
    return NextResponse.json({ error: "Select at least one recipient." }, { status: 400 });
  }

  if (input.committeeId && !(await isClubCommitteeId(input.committeeId))) {
    return NextResponse.json({ error: "That committee does not exist." }, { status: 400 });
  }
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(input.audience === "ROLE" && input.audienceRole ? { role: input.audienceRole } : {}),
      ...(input.audience === "COMMITTEE" && input.committeeId ? { committeeId: input.committeeId } : {}),
      ...(input.audience === "USERS" ? { id: { in: input.userIds ?? [] } } : {}),
    },
    select: { id: true, notificationPreferences: { where: { type: input.type }, select: { inApp: true, push: true } } },
  });
  const now = new Date();
  const scheduledAt = input.scheduledAt && input.scheduledAt > now ? input.scheduledAt : null;
  const deliverUsers = users.filter((user) => {
    const preference = user.notificationPreferences[0];
    return preference?.inApp !== false || preference?.push !== false;
  });
  const notification = await prisma.$transaction(async (transaction) => {
    const created = await transaction.notification.create({
      data: {
        title: input.title,
        titleAr: input.titleAr || null,
        message: input.message,
        messageAr: input.messageAr || null,
        link: input.link ?? null,
        type: input.type,
        audience: input.audience,
        audienceRole: input.audienceRole ?? null,
        committeeId: input.audience === "COMMITTEE" ? input.committeeId ?? null : null,
        important: input.important,
        scheduledAt,
        sentAt: scheduledAt ? null : now,
        createdById: access.user.id,
      },
    });
    if (deliverUsers.length) {
      await transaction.notificationRecipient.createMany({
        data: deliverUsers.map((user) => ({ notificationId: created.id, userId: user.id, deliveredAt: scheduledAt ? null : now })),
        skipDuplicates: true,
      });
    }
    return created;
  });
  await writeAuditLog({ actorId: access.user.id, action: scheduledAt ? "notification.schedule" : "notification.send", targetType: "Notification", targetId: notification.id });
  const push = scheduledAt ? { configured: false, sent: 0 } : await dispatchPushNotification(notification.id);
  if (!push.configured && !scheduledAt) console.warn("[Notifications] VAPID is not configured; push delivery was skipped.");
  return NextResponse.json({ notification, recipientCount: deliverUsers.length, pushConfigured: push.configured }, { status: 201 });
}

export const GET = withApiErrorHandling(GETInternal, "/api/notifications");
export const POST = withApiErrorHandling(POSTInternal, "/api/notifications");
