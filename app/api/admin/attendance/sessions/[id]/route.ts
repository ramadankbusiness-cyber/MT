import { withApiErrorHandling } from "@/lib/api-error-handler";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";

type RouteContext = { params: Promise<{ id: string }> };

async function GETInternal(_request: Request, context: RouteContext) {
  const adminAccess = await requirePermission("attendance.read.all");
  let actor;
  if ("error" in adminAccess) {
    const committeeAccess = await requirePermission("attendance.read.committee");
    if ("error" in committeeAccess) return NextResponse.json({ error: committeeAccess.error }, { status: committeeAccess.status });
    actor = committeeAccess.user;
  } else {
    actor = adminAccess.user;
  }
  const isAdmin = actor.role === "ADMIN";
  const { id } = await context.params;
  const session = await prisma.attendanceSession.findUnique({
    where: { id },
    include: { committee: { select: { id: true, name: true } } },
  });
  if (!session) return NextResponse.json({ error: "Attendance session not found." }, { status: 404 });
  if (!isAdmin && session.committeeId && session.committeeId !== actor.committeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const participantFilter = isAdmin ? {} : { user: { committeeId: actor.committeeId } };
  const [records, attempts] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { sessionId: id, ...participantFilter },
      include: { user: { select: { id: true, name: true, email: true, committee: { select: { name: true } } } } },
      orderBy: { checkedInAt: "asc" },
    }),
    prisma.attendanceAttempt.findMany({
      where: { sessionId: id, ...participantFilter },
      include: { user: { select: { name: true, committee: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  return NextResponse.json({ session, records, attempts });
}

export const GET = withApiErrorHandling(GETInternal, "/api/admin/attendance/sessions/[id]");
