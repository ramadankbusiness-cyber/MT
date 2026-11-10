import { sendNotification, setVapidDetails } from "web-push";
import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function dispatchPushNotification(notificationId: string) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return { configured: false, sent: 0 };
  setVapidDetails(subject, publicKey, privateKey);

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, title: true, message: true, link: true, type: true },
  });
  if (!notification) return { configured: true, sent: 0 };
  const recipients = await prisma.notificationRecipient.findMany({
    where: { notificationId, pushSentAt: null, pushAttempts: { lt: 5 } },
    include: {
      user: {
        select: {
          pushSubscriptions: true,
          notificationPreferences: { where: { type: notification.type }, select: { push: true } },
        },
      },
    },
  });

  let sent = 0;
  for (const recipient of recipients) {
    const preference = recipient.user.notificationPreferences[0];
    if (preference?.push === false || !recipient.user.pushSubscriptions.length) {
      await prisma.notificationRecipient.update({
        where: { id: recipient.id },
        data: { pushSentAt: new Date() },
      });
      continue;
    }

    let delivered = false;
    for (const subscription of recipient.user.pushSubscriptions) {
      try {
        await sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          JSON.stringify({ title: notification.title, body: notification.message, url: notification.link ?? "/notifications", tag: notification.id }),
        );
        delivered = true;
      } catch (error) {
        const statusCode = error && typeof error === "object" && "statusCode" in error ? error.statusCode : undefined;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: subscription.id } });
        } else {
          console.error("[Push delivery] Send failed", { subscriptionId: subscription.id, statusCode });
        }
      }
    }
    await prisma.notificationRecipient.update({
      where: { id: recipient.id },
      data: {
        pushAttempts: { increment: 1 },
        pushSentAt: delivered ? new Date() : null,
      },
    });
    if (delivered) sent += 1;
  }
  return { configured: true, sent };
}

export async function dispatchDueNotifications(now = new Date()) {
  const due = await prisma.notification.findMany({
    where: { sentAt: null, scheduledAt: { lte: now } },
    take: 100,
    orderBy: { scheduledAt: "asc" },
    select: { id: true },
  });
  let sent = 0;
  for (const notification of due) {
    await prisma.$transaction(async (transaction) => {
      await transaction.notificationRecipient.updateMany({
        where: { notificationId: notification.id, deliveredAt: null },
        data: { deliveredAt: now },
      });
      await transaction.notification.update({ where: { id: notification.id }, data: { sentAt: now } });
    });
    await dispatchPushNotification(notification.id);
    sent += 1;
  }
  return sent;
}

export async function createImmediateNotification(input: {
  title: string;
  message: string;
  link: string;
  type: NotificationType;
  audience: "EVERYONE" | "COMMITTEE" | "USERS";
  committeeId: string | null;
  createdById: string;
  userIds?: string[];
}) {
  const now = new Date();
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(input.audience === "COMMITTEE" && input.committeeId ? { committeeId: input.committeeId } : {}),
      ...(input.audience === "USERS" ? { id: { in: input.userIds ?? [] } } : {}),
    },
    select: { id: true, notificationPreferences: { where: { type: input.type }, select: { inApp: true, push: true } } },
  });
  const recipients = users.filter((user) => {
    const preference = user.notificationPreferences[0];
    return preference?.inApp !== false || preference?.push !== false;
  });
  const notification = await prisma.$transaction(async (transaction) => {
    const created = await transaction.notification.create({
      data: {
        ...input,
        sentAt: now,
      },
    });
    if (recipients.length) {
      await transaction.notificationRecipient.createMany({
        data: recipients.map((user) => ({ notificationId: created.id, userId: user.id, deliveredAt: now })),
        skipDuplicates: true,
      });
    }
    return created;
  });
  await dispatchPushNotification(notification.id);
  return notification;
}

export async function dispatchOperationalReminders(now = new Date()) {
  const reminders = [
    { hours: 24, label: "24-hour reminder" },
    { hours: 1, label: "1-hour reminder" },
  ];
  let created = 0;
  for (const reminder of reminders) {
    const threshold = now.getTime() + reminder.hours * 60 * 60 * 1000;
    const events = await prisma.event.findMany({
      where: {
        published: true,
        startsAt: { gt: new Date(threshold - 2 * 60_000), lte: new Date(threshold) },
      },
      select: { id: true, title: true, startsAt: true, committeeId: true, createdById: true },
    });
    for (const event of events) {
      const link = `/events?event=${encodeURIComponent(event.id)}&reminder=${reminder.hours}h`;
      const exists = await prisma.notification.findFirst({ where: { type: "EVENT_REMINDER", link }, select: { id: true } });
      if (exists) continue;
      const recipients = await prisma.user.findMany({
        where: { isActive: true, ...(event.committeeId ? { committeeId: event.committeeId } : {}) },
        select: { id: true, notificationPreferences: { where: { type: "EVENT_REMINDER" }, select: { inApp: true, push: true } } },
      });
      const deliverable = recipients.filter((user) => {
        const preference = user.notificationPreferences[0];
        return preference?.inApp !== false || preference?.push !== false;
      });
      const notification = await prisma.$transaction(async (transaction) => {
        const createdNotification = await transaction.notification.create({
          data: {
            title: `${reminder.label}: ${event.title}`,
            message: `“${event.title}” starts ${reminder.hours === 1 ? "in one hour" : "in 24 hours"}.`,
            link,
            type: "EVENT_REMINDER",
            audience: event.committeeId ? "COMMITTEE" : "EVERYONE",
            committeeId: event.committeeId,
            createdById: event.createdById,
            sentAt: now,
          },
        });
        if (deliverable.length) {
          await transaction.notificationRecipient.createMany({
            data: deliverable.map((user) => ({ notificationId: createdNotification.id, userId: user.id, deliveredAt: now })),
            skipDuplicates: true,
          });
        }
        return createdNotification;
      });
      await dispatchPushNotification(notification.id);
      created += 1;
    }
  }

  const sessions = await prisma.attendanceSession.findMany({
    where: { startsAt: { gt: new Date(now.getTime() - 2 * 60_000), lte: now }, endsAt: { gt: now } },
    select: { id: true, title: true, committeeId: true, createdById: true },
  });
  for (const session of sessions) {
    const link = `/dashboard?session=${encodeURIComponent(session.id)}`;
    const exists = await prisma.notification.findFirst({ where: { type: "SESSION_OPENED", link }, select: { id: true } });
    if (exists) continue;
    const recipients = await prisma.user.findMany({
      where: { isActive: true, ...(session.committeeId ? { committeeId: session.committeeId } : {}) },
      select: { id: true, notificationPreferences: { where: { type: "SESSION_OPENED" }, select: { inApp: true, push: true } } },
    });
    const deliverable = recipients.filter((user) => {
      const preference = user.notificationPreferences[0];
      return preference?.inApp !== false || preference?.push !== false;
    });
    const notification = await prisma.$transaction(async (transaction) => {
      const createdNotification = await transaction.notification.create({
        data: {
          title: "Attendance is open",
          message: `Check-in is now open for ${session.title}.`,
          link,
          type: "SESSION_OPENED",
          audience: session.committeeId ? "COMMITTEE" : "EVERYONE",
          committeeId: session.committeeId,
          createdById: session.createdById,
          sentAt: now,
        },
      });
      if (deliverable.length) {
        await transaction.notificationRecipient.createMany({
          data: deliverable.map((user) => ({ notificationId: createdNotification.id, userId: user.id, deliveredAt: now })),
          skipDuplicates: true,
        });
      }
      return createdNotification;
    });
    await dispatchPushNotification(notification.id);
    created += 1;
  }
  return created;
}

export function isNotificationType(value: string): value is NotificationType {
  return Object.values(NotificationType).includes(value as NotificationType);
}

export async function countUnreadForUser(userId: string) {
  const rows = await prisma.notificationRecipient.findMany({
    where: { userId, readAt: null, deliveredAt: { not: null } },
    select: {
      notification: { select: { type: true } },
      user: { select: { notificationPreferences: { select: { type: true, inApp: true } } } },
    },
  });
  return rows.filter((row) => row.user.notificationPreferences.find((preference) => preference.type === row.notification.type)?.inApp !== false).length;
}
