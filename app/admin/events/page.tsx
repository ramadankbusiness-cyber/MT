import { redirect } from "next/navigation";
import { AdminEventManager } from "@/components/admin-event-manager";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { listClubCommittees } from "@/lib/committees";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manage events" };

export default async function AdminEventsPage() {
  const access = await requirePermission("events.create");
  if ("error" in access) redirect(access.status === 401 ? "/login?message=login-required" : "/forbidden");
  const isAdmin = access.user.role === "ADMIN";
  const [events, committees] = await Promise.all([
    prisma.event.findMany({
      where: isAdmin ? {} : { committeeId: access.user.committeeId },
      include: { committee: { select: { id: true, name: true } } },
      orderBy: { startsAt: "desc" },
    }),
    listClubCommittees(isAdmin ? undefined : access.user.committeeId),
  ]);
  return (
    <main id="main-content" className="inner-page">
      <section className="content-section page-intro">
        <div className="section-heading"><p className="eyebrow">CLUB CALENDAR</p><h1>Manage events</h1><p className="section-lead">Publish club events, manage committee visibility, and keep the calendar current.</p></div>
        <AdminEventManager initialEvents={events} committees={committees} isAdmin={isAdmin} />
      </section>
    </main>
  );
}
