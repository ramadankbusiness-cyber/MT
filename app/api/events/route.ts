import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requirePermission } from "@/lib/auth-guards";
import { eventSchema } from "@/lib/schemas";
import { writeAuditLog } from "@/lib/audit";
import { createImmediateNotification } from "@/lib/notification-delivery";
import { isClubCommitteeId } from "@/lib/committees";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const manage = new URL(request.url).searchParams.get("manage") === "true";
  if (manage) {
    const access = await requirePermission("events.create");
    if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
    const events = await prisma.event.findMany({
      where: access.user.role === "ADMIN" ? {} : { committeeId: access.user.committeeId },
      include: { committee: { select: { id: true, name: true } } },
      orderBy: { startsAt: "desc" },
    });
    return NextResponse.json({ events });
  }
  const events = await prisma.event.findMany({
    where: { published: true },
    orderBy: { startsAt: "asc" },
    take: 100,
    include: { committee: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ events, authenticated: !!user?.isActive });
}

export async function POST(request: Request) {
  const access = await requirePermission("events.create");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body: unknown = await request.json().catch(() => null);
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check the event details." }, { status: 400 });
  const committeeId = access.user.role === "LEADER" ? access.user.committeeId : parsed.data.committeeId ?? null;
  if (access.user.role === "LEADER" && !committeeId) return NextResponse.json({ error: "Your account must be assigned to a committee." }, { status: 403 });
  if (committeeId && !(await isClubCommitteeId(committeeId))) {
    return NextResponse.json({ error: "Choose an existing committee." }, { status: 400 });
  }
  const event = await prisma.event.create({
    data: { ...parsed.data, committeeId, createdById: access.user.id },
    include: { committee: { select: { id: true, name: true } } },
  });
  await writeAuditLog({ actorId: access.user.id, action: "event.create", targetType: "Event", targetId: event.id });
  if (event.published) {
    await createImmediateNotification({
      title: `New event: ${event.title}`,
      message: event.description,
      link: `/events?event=${encodeURIComponent(event.id)}`,
      type: "NEW_EVENT",
      audience: event.committeeId ? "COMMITTEE" : "EVERYONE",
      committeeId: event.committeeId,
      createdById: access.user.id,
    });
  }
  return NextResponse.json({ event }, { status: 201 });
}
