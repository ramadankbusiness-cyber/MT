import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchDueNotifications, dispatchOperationalReminders, dispatchPushNotification } from "@/lib/notification-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  if (!secret || secret.length < 32 || !authorization.startsWith("Bearer ")) return false;
  const provided = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(secret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

async function runNotificationsCron(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scheduled = await dispatchDueNotifications();
  const reminders = await dispatchOperationalReminders();
  const pending = await prisma.notificationRecipient.findMany({
    where: {
      pushSentAt: null,
      pushAttempts: { lt: 5 },
      deliveredAt: { not: null },
      notification: { sentAt: { not: null } },
    },
    distinct: ["notificationId"],
    take: 100,
    select: { notificationId: true },
  });
  let pushRetries = 0;
  for (const item of pending) {
    await dispatchPushNotification(item.notificationId);
    pushRetries += 1;
  }
  return NextResponse.json({ scheduled, reminders, pushRetries });
}

export async function GET(request: Request) {
  return runNotificationsCron(request);
}

export async function POST(request: Request) {
  return runNotificationsCron(request);
}
