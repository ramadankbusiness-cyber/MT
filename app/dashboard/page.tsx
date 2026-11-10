import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";
import { countUnreadForUser } from "@/lib/notification-delivery";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

function percentage(attended: number, eligible: number) {
  return eligible ? Math.round(attended / eligible * 100) : 0;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const upcomingEvents = await prisma.event.findMany({
    where: {
      published: true,
      startsAt: { gte: now },
      ...(user.role === "ADMIN" ? {} : { OR: [{ committeeId: null }, { committeeId: user.committeeId }] }),
    },
    orderBy: { startsAt: "asc" },
    take: 3,
    select: { id: true, title: true, startsAt: true, location: true },
  });
  const unreadCount = await countUnreadForUser(user.id);

  let stats: { label: string; value: string }[] = [];
  let activity: { id: string; label: string; date: Date }[] = [];
  if (user.role === "ADMIN") {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [members, todaySessions, checkIns, logs] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.attendanceSession.count({ where: { startsAt: { gte: startOfDay }, endsAt: { gt: now } } }),
      prisma.attendanceRecord.count({ where: { checkedInAt: { gte: startOfDay } } }),
      prisma.auditLog.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, action: true, createdAt: true } }),
    ]);
    stats = [
      { label: "Active accounts", value: String(members) },
      { label: "Sessions today", value: String(todaySessions) },
      { label: "Check-ins today", value: String(checkIns) },
      { label: "Unread notifications", value: String(unreadCount) },
    ];
    activity = logs.map((log) => ({ id: log.id, label: log.action.replaceAll(".", " "), date: log.createdAt }));
  } else if (user.role === "LEADER") {
    const [members, sessions, checkIns] = await Promise.all([
      prisma.user.count({ where: { committeeId: user.committeeId, role: "MEMBER", isActive: true } }),
      prisma.attendanceSession.count({ where: { committeeId: user.committeeId, endsAt: { gte: now } } }),
      prisma.attendanceRecord.count({ where: { session: { committeeId: user.committeeId }, checkedInAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } } }),
    ]);
    stats = [
      { label: "Active committee members", value: String(members) },
      { label: "Upcoming sessions", value: String(sessions) },
      { label: "Check-ins this month", value: String(checkIns) },
      { label: "Unread notifications", value: String(unreadCount) },
    ];
  } else {
    const eligibleSessions = await prisma.attendanceSession.count({
      where: {
        endsAt: { lte: now },
        OR: [{ committeeId: null }, { committeeId: user.committeeId }],
      },
    });
    const attended = await prisma.attendanceRecord.count({
      where: { userId: user.id, status: { in: ["PRESENT", "LATE"] } },
    });
    const [lastRecords, latestNotice] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: { userId: user.id },
        orderBy: { checkedInAt: "desc" },
        take: 3,
        include: { session: { select: { title: true } } },
      }),
      prisma.notificationRecipient.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        include: { notification: { select: { title: true, message: true } } },
      }),
    ]);
    stats = [
      { label: "Attendance", value: `${percentage(attended, eligibleSessions)}%` },
      { label: "Sessions attended", value: String(attended) },
      { label: "Sessions held", value: String(eligibleSessions) },
      { label: "Unread notifications", value: String(unreadCount) },
    ];
    activity = lastRecords.map((record) => ({ id: record.id, label: `${record.session.title} · ${record.status.toLowerCase()}`, date: record.checkedInAt ?? record.createdAt }));
    if (latestNotice) activity.unshift({ id: latestNotice.id, label: latestNotice.notification.title, date: latestNotice.createdAt });
  }

  const links = user.role === "ADMIN"
    ? [
      { href: "/admin/users", label: "Manage accounts" },
      { href: "/team", label: "Manage team page" },
      { href: "/admin/events", label: "Manage events" },
      { href: "/admin/zones", label: "Attendance zones" },
      { href: "/attendance", label: "Attendance sessions" },
      { href: "/admin/notifications", label: "Send notifications" },
      { href: "/admin/audit", label: "Audit log" },
      { href: "/admin/permissions", label: "Permissions matrix" },
    ]
    : user.role === "LEADER" ? [
      { href: "/admin/events", label: "Manage committee events" },
      { href: "/attendance", label: "View sessions" },
      { href: "/admin/notifications", label: "Notify your committee" },
    ] : [{ href: "/attendance", label: "Scan attendance" }];
  return (
    <main id="main-content" className="inner-page">
      <section className="content-section page-intro dashboard-page">
        <div className="section-heading">
          <p className="eyebrow">{user.role} DASHBOARD</p>
          <h1>Welcome back, <span className="gradient-text">{user.name.split(" ")[0]}</span>.</h1>
          <p className="section-lead">Your MT Club overview and latest updates.</p>
        </div>
        <div className="dashboard-stat-grid">{stats.map((stat) => <article className="dashboard-stat" key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong></article>)}</div>
        <div className="dashboard-columns">
          <section className="dashboard-panel"><div className="dashboard-panel-heading"><h2>Upcoming events</h2><Link href="/events">View all</Link></div>
            {upcomingEvents.length ? <ul className="dashboard-list">{upcomingEvents.map((event) => <li key={event.id}><strong>{event.title}</strong><span>{event.startsAt.toLocaleDateString()} · {event.location || "Location to be announced"}</span></li>)}</ul> : <p className="empty-note">No upcoming events are scheduled yet.</p>}
          </section>
          <section className="dashboard-panel"><div className="dashboard-panel-heading"><h2>Recent activity</h2><Link href="/notifications">Notifications</Link></div>
            {activity.length ? <ul className="dashboard-list">{activity.slice(0, 5).map((item) => <li key={item.id}><strong>{item.label}</strong><span>{item.date.toLocaleString()}</span></li>)}</ul> : <p className="empty-note">Your recent updates will appear here.</p>}
          </section>
        </div>
        {links.length > 0 && <nav className="dashboard-admin-links" aria-label="Administration">{links.map((link) => <Link className="button button-secondary" href={link.href} key={link.href}>{link.label}</Link>)}</nav>}
      </section>
    </main>
  );
}
