import { withApiErrorHandling } from "@/lib/api-error-handler";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { manualAttendanceSchema } from "@/lib/schemas";
import { writeAuditLog } from "@/lib/audit";

type RouteContext = { params: Promise<{ id: string }> };

async function POSTInternal(request: Request, context: RouteContext) {
  const access = await requirePermission("attendance.manualMark");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body: unknown = await request.json().catch(() => null);
  const parsed = manualAttendanceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a member, attendance status, and reason." }, { status: 400 });
  const { id: sessionId } = await context.params;
  const [session, member] = await Promise.all([
    prisma.attendanceSession.findUnique({ where: { id: sessionId }, select: { id: true, committeeId: true } }),
    prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true, committeeId: true } }),
  ]);
  if (!session) return NextResponse.json({ error: "Attendance session not found." }, { status: 404 });
  if (!member || (session.committeeId && member.committeeId !== session.committeeId)) {
    return NextResponse.json({ error: "Choose an eligible member for this session." }, { status: 400 });
  }
  const record = await prisma.attendanceRecord.upsert({
    where: { userId_sessionId: { userId: member.id, sessionId } },
    create: {
      userId: member.id, sessionId, status: parsed.data.status,
      reason: parsed.data.reason, markedById: access.user.id,
      checkedInAt: parsed.data.status === "PRESENT" || parsed.data.status === "LATE" ? new Date() : null,
    },
    update: {
      status: parsed.data.status, reason: parsed.data.reason, markedById: access.user.id,
      checkedInAt: parsed.data.status === "PRESENT" || parsed.data.status === "LATE" ? new Date() : null,
      distanceMeters: null, accuracyMeters: null,
    },
    include: { user: { select: { id: true, name: true } } },
  });
  await writeAuditLog({
    actorId: access.user.id,
    action: "attendance.manual.mark",
    targetType: "AttendanceRecord",
    targetId: record.id,
    details: { sessionId, userId: member.id, status: record.status, reason: parsed.data.reason },
  });
  return NextResponse.json({ record });
}

export const POST = withApiErrorHandling(POSTInternal, "/api/admin/attendance/sessions/[id]/records");
