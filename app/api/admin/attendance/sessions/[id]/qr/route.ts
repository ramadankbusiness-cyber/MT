import { withApiErrorHandling } from "@/lib/api-error-handler";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { issueQrToken, rotatingTokenExpiry } from "@/lib/qr-token";
import { writeAuditLog } from "@/lib/audit";

type RouteContext = { params: Promise<{ id: string }> };

async function POSTInternal(_request: Request, context: RouteContext) {
  const access = await requirePermission("attendance.qr.generate");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  const session = await prisma.attendanceSession.findUnique({ where: { id } });
  const now = new Date();
  if (!session) return NextResponse.json({ error: "Attendance session not found." }, { status: 404 });
  if (session.startsAt > now || session.endsAt <= now) {
    return NextResponse.json({ error: "QR codes are available only while the attendance session is open." }, { status: 409 });
  }

  const isStatic = session.qrMode === "STATIC";
  const expiry = isStatic ? session.endsAt : rotatingTokenExpiry(now.getTime());
  const previous = isStatic
    ? await prisma.qrToken.findFirst({ where: { sessionId: id, static: true, expiresAt: { gt: now } }, orderBy: { createdAt: "asc" } })
    : null;
  const issued = issueQrToken({ sessionId: id, static: isStatic, expiresAt: expiry, jti: previous?.jti });
  if (!previous) {
    await prisma.qrToken.create({ data: { jti: issued.jti, sessionId: id, expiresAt: expiry, static: isStatic } });
  }
  await writeAuditLog({
    actorId: access.user.id,
    action: isStatic ? "attendance.qr.static.issue" : "attendance.qr.rotating.issue",
    targetType: "AttendanceSession",
    targetId: id,
  });
  return NextResponse.json({ token: issued.token, expiresAt: expiry.toISOString(), static: isStatic });
}

export const POST = withApiErrorHandling(POSTInternal, "/api/admin/attendance/sessions/[id]/qr");
