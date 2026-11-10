import { requirePermission } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

function csvCell(value: string | number | null) {
  let text = value === null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
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
  const fromDate = from ? new Date(from) : undefined;
  const toDate = to ? new Date(to) : undefined;
  if ((from && Number.isNaN(fromDate?.getTime())) || (to && Number.isNaN(toDate?.getTime()))) {
    return Response.json({ error: "Use valid date values for the report range." }, { status: 400 });
  }
  const records = await prisma.attendanceRecord.findMany({
    where: {
      ...(isAdmin ? {} : { user: { committeeId: actor.committeeId } }),
      ...(fromDate || toDate ? { checkedInAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
    },
    include: {
      user: { select: { name: true, email: true, committee: { select: { name: true } } } },
      session: { select: { title: true } },
    },
    orderBy: { checkedInAt: "desc" },
    take: 10_000,
  });
  const rows = [
    ["Member", "Email", "Committee", "Session", "Status", "Checked in at", "Distance (m)", "Accuracy (m)"],
    ...records.map((record) => [
      record.user.name, record.user.email, record.user.committee?.name ?? "",
      record.session.title, record.status, record.checkedInAt?.toISOString() ?? "",
      record.distanceMeters ?? "", record.accuracyMeters ?? "",
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mt-club-attendance.csv"',
      "Cache-Control": "no-store",
    },
  });
}
