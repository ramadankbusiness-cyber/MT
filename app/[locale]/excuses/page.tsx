import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { ExcuseManager } from "@/components/excuse-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Excuse requests" };

export default async function ExcusesPage() {
  const user = await requireUser();
  const canReview = user.role !== "MEMBER";
  const where = user.role === "ADMIN" ? {} : user.role === "LEADER" ? { user: { committeeId: user.committeeId } } : { userId: user.id };
  const [excuses, sessions] = await Promise.all([
    prisma.excuse.findMany({
      where,
      include: {
        user: { select: { name: true, committee: { select: { name: true } } } },
        session: { select: { id: true, title: true, startsAt: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    canReview ? Promise.resolve([]) : prisma.attendanceSession.findMany({
      where: {
        OR: [{ committeeId: null }, { committeeId: user.committeeId }],
        endsAt: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { startsAt: "desc" },
      take: 100,
      select: { id: true, title: true, startsAt: true },
    }),
  ]);
  return (
    <main id="main-content" className="inner-page">
      <section className="content-section page-intro">
        <div className="section-heading"><p className="eyebrow">ATTENDANCE</p><h1>Excuse requests</h1><p className="section-lead">Request an excuse for a session, or review requests for your committee.</p></div>
        <ExcuseManager
          role={user.role}
          sessions={sessions.map((session) => ({ ...session, startsAt: session.startsAt.toISOString() }))}
          initialExcuses={excuses.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
            session: { ...item.session, startsAt: item.session.startsAt.toISOString() },
          }))}
        />
      </section>
    </main>
  );
}
