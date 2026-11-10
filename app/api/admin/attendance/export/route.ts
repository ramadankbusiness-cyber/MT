import { withApiErrorHandling } from "@/lib/api-error-handler";
import { requirePermission } from "@/lib/auth-guards";
import { isClubCommitteeId } from "@/lib/committees";
import { prisma } from "@/lib/prisma";

function csvCell(value: string | number | null) {
  let text = value === null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

async function GETInternal(request: Request) {
  const adminAccess = await requirePermission("attendance.export");
  let actor;
  if ("error" in adminAccess) {
    const committeeAccess = await requirePermission("attendance.export.committee");
    if ("error" in committeeAccess) return Response.json({ error: committeeAccess.error }, { status: committeeAccess.status });
    actor = committeeAccess.user;
  } else {
    actor = adminAccess.user;
  }
  const isAdmin = actor.role === "ADMIN";
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const requestedCommittee = url.searchParams.get("committeeId");
  if (requestedCommittee && (!isAdmin || !(await isClubCommitteeId(requestedCommittee)))) {
    return Response.json({ error: "Choose an allowed committee for this report." }, { status: 400 });
  }
  const fromDate = from ? new Date(from) : undefined;
  const toDate = to ? new Date(`${to}T23:59:59.999Z`) : undefined;
  if ((from && Number.isNaN(fromDate?.getTime())) || (to && Number.isNaN(toDate?.getTime()))) {
    return Response.json({ error: "Use valid date values for the report range." }, { status: 400 });
  }
  if (fromDate && toDate && fromDate > toDate) {
    return Response.json({ error: "The report start date must be before its end date." }, { status: 400 });
  }
  const sessionScope = isAdmin
    ? requestedCommittee ? { OR: [{ committeeId: null }, { committeeId: requestedCommittee }] } : {}
    : { OR: [{ committeeId: null }, { committeeId: actor.committeeId }] };
  const userScope = isAdmin
    ? requestedCommittee ? { committeeId: requestedCommittee } : {}
    : { committeeId: actor.committeeId };
  const [sessions, users] = await Promise.all([
    prisma.attendanceSession.findMany({
      where: {
        endsAt: { lte: new Date() },
        ...(fromDate || toDate ? { startsAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
        ...sessionScope,
      },
      select: { id: true, title: true, startsAt: true, committeeId: true },
      orderBy: { startsAt: "desc" },
    }),
    prisma.user.findMany({
      where: { isActive: true, ...userScope },
      select: { id: true, name: true, email: true, committeeId: true, committee: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  if (sessions.length * users.length > 10_000) {
    return Response.json({ error: "Narrow the date range to export at most 10,000 attendance rows." }, { status: 400 });
  }
  const records = sessions.length && users.length ? await prisma.attendanceRecord.findMany({
    where: {
      sessionId: { in: sessions.map((session) => session.id) },
      userId: { in: users.map((user) => user.id) },
    },
    select: { userId: true, sessionId: true, status: true, checkedInAt: true, distanceMeters: true, accuracyMeters: true },
  }) : [];
  const recordsByPair = new Map(records.map((record) => [`${record.userId}:${record.sessionId}`, record]));
  const rows: (string | number | null)[][] = [
    ["Member", "Email", "Committee", "Session", "Session date", "Status", "Checked in at", "Distance (m)", "Accuracy (m)"],
  ];
  for (const session of sessions) {
    for (const user of users) {
      if (session.committeeId && session.committeeId !== user.committeeId) continue;
      const record = recordsByPair.get(`${user.id}:${session.id}`);
      rows.push([
        user.name, user.email, user.committee?.name ?? "",
        session.title, session.startsAt.toISOString(),
        record?.status ?? "ABSENT", record?.checkedInAt?.toISOString() ?? "",
        record?.distanceMeters ?? "", record?.accuracyMeters ?? "",
      ]);
    }
  }
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mt-club-attendance.csv"',
      "Cache-Control": "no-store",
    },
  });
}

export const GET = withApiErrorHandling(GETInternal, "/api/admin/attendance/export");
