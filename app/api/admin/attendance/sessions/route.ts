import { withApiErrorHandling } from "@/lib/api-error-handler";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { attendanceSessionSchema } from "@/lib/schemas";
import { writeAuditLog } from "@/lib/audit";
import { isClubCommitteeId } from "@/lib/committees";

async function GETInternal() {
  const access = await requirePermission("attendance.read.all");
  if ("error" in access) {
    const committeeAccess = await requirePermission("attendance.read.committee");
    if ("error" in committeeAccess) return NextResponse.json({ error: committeeAccess.error }, { status: committeeAccess.status });
    const sessions = await prisma.attendanceSession.findMany({
      where: { OR: [{ committeeId: null }, { committeeId: committeeAccess.user.committeeId }] },
      include: {
        committee: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true, latitude: true, longitude: true, radiusMeters: true } },
        _count: { select: { records: true } },
      },
      orderBy: { startsAt: "desc" },
    });
    return NextResponse.json({ sessions });
  }
  const sessions = await prisma.attendanceSession.findMany({
    include: {
      committee: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true, latitude: true, longitude: true, radiusMeters: true } },
      _count: { select: { records: true } },
    },
    orderBy: { startsAt: "desc" },
  });
  return NextResponse.json({ sessions });
}

async function POSTInternal(request: Request) {
  const access = await requirePermission("attendance.sessions.create");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body: unknown = await request.json().catch(() => null);
  const parsed = attendanceSessionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check the attendance session details." }, { status: 400 });
  const [zone, committee] = await Promise.all([
    prisma.zone.findUnique({ where: { id: parsed.data.zoneId }, select: { id: true } }),
    parsed.data.committeeId ? isClubCommitteeId(parsed.data.committeeId) : Promise.resolve(true),
  ]);
  if (!zone) return NextResponse.json({ error: "Choose an existing attendance zone." }, { status: 400 });
  if (!committee) return NextResponse.json({ error: "Choose an existing committee." }, { status: 400 });

  const session = await prisma.attendanceSession.create({
    data: { ...parsed.data, createdById: access.user.id },
    include: {
      committee: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true, latitude: true, longitude: true, radiusMeters: true } },
    },
  });
  await writeAuditLog({ actorId: access.user.id, action: "attendance.session.create", targetType: "AttendanceSession", targetId: session.id });
  return NextResponse.json({ session }, { status: 201 });
}

export const GET = withApiErrorHandling(GETInternal, "/api/admin/attendance/sessions");
export const POST = withApiErrorHandling(POSTInternal, "/api/admin/attendance/sessions");
