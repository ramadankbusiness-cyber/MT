import { redirect } from "next/navigation";
import { NotificationComposer } from "@/components/notification-composer";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { listClubCommittees } from "@/lib/committees";

export const dynamic = "force-dynamic";
export const metadata = { title: "Send notifications" };

export default async function AdminNotificationsPage() {
  const access = await requirePermission("notifications.send");
  if ("error" in access) redirect("/login");
  const isAdmin = access.user.role === "ADMIN";
  const [committees, users] = await Promise.all([
    listClubCommittees(isAdmin ? undefined : access.user.committeeId),
    prisma.user.findMany({
      where: { isActive: true, ...(isAdmin ? {} : { committeeId: access.user.committeeId }) },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);
  return (
    <main id="main-content" className="inner-page">
      <section className="content-section page-intro">
        <div className="section-heading"><p className="eyebrow">CLUB COMMUNICATIONS</p><h1>Notifications</h1><p className="section-lead">Send in-app and push updates, preview the message, or schedule it for later.</p></div>
        <NotificationComposer role={access.user.role} committees={committees} users={users} />
      </section>
    </main>
  );
}
