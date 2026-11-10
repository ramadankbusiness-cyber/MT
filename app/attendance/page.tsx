import { AttendanceTools, type AttendanceSessionView } from "@/components/attendance-tools";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";
import { listClubCommittees } from "@/lib/committees";

export const dynamic = "force-dynamic";
export const metadata = { title: "Attendance" };

export default async function AttendancePage() {
  const user = await requireUser();
  const now = new Date();
  if (user.role === "MEMBER") {
    const [sessions, records, attended] = await Promise.all([
      prisma.attendanceSession.count({ where: { endsAt: { lte: now }, OR: [{ committeeId: null }, { committeeId: user.committeeId }] } }),
      prisma.attendanceRecord.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { session: { select: { title: true } } },
      }),
      prisma.attendanceRecord.count({ where: { userId: user.id, status: { in: ["PRESENT", "LATE"] } } }),
    ]);
    return (
      <main id="main-content" className="inner-page">
        <section className="content-section page-intro">
          <div className="section-heading"><p className="eyebrow">MEMBER AREA</p><h1>Attendance</h1><p className="section-lead">Check in to a session and follow your attendance history.</p></div>
          <AttendanceTools role="MEMBER" initialSessions={[]} zones={[]} committees={[]} members={[]} records={records.map((record) => ({ ...record, checkedInAt: record.checkedInAt?.toISOString() ?? null }))} attendanceRate={sessions ? Math.round(attended / sessions * 100) : 0} />
        </section>
      </main>
    );
  }
  const sessions = await prisma.attendanceSession.findMany({
    where: user.role === "ADMIN" ? {} : { OR: [{ committeeId: null }, { committeeId: user.committeeId }] },
    include: {
      committee: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true, latitude: true, longitude: true, radiusMeters: true } },
      _count: { select: { records: true } },
    },
    orderBy: { startsAt: "desc" },
  });
  const [zones, committees, members] = user.role === "ADMIN" ? await Promise.all([
    prisma.zone.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    listClubCommittees(),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, committeeId: true, committee: { select: { name: true } } } }),
  ]) : [[], [], []];
  const sessionViews: AttendanceSessionView[] = sessions.map((session) => ({
    id: session.id,
    title: session.title,
    startsAt: session.startsAt.toISOString(),
    endsAt: session.endsAt.toISOString(),
    lateAfterMinutes: session.lateAfterMinutes,
    qrMode: session.qrMode,
    committee: session.committee,
    zone: session.zone,
    recordCount: session._count.records,
  }));
  return (
    <main id="main-content" className="inner-page">
      <section className="content-section page-intro">
        <div className="section-heading"><p className="eyebrow">{user.role} AREA</p><h1>Attendance sessions</h1><p className="section-lead">Manage check-in windows and display session QR codes.</p></div>
        <AttendanceTools role={user.role} initialSessions={sessionViews} zones={zones} committees={committees} members={members} records={[]} attendanceRate={0} />
      </section>
    </main>
  );
}
