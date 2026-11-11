import { redirect } from "next/navigation";
import { AdminEventManager } from "@/components/admin-event-manager";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { listClubCommittees } from "@/lib/committees";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return { title: locale === "ar" ? "إدارة الفعاليات" : "Manage events" };
}

export default async function AdminEventsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site.adminCommunication.events" });
  const access = await requirePermission("events.create");
  if ("error" in access) redirect(access.status === 401 ? "/login?message=login-required" : "/forbidden");
  const isAdmin = access.user.role === "ADMIN";
  const [events, committees] = await Promise.all([
    prisma.event.findMany({
      where: isAdmin ? {} : { committeeId: access.user.committeeId },
      include: { committee: { select: { id: true, name: true } } },
      orderBy: { startsAt: "desc" },
    }).then((events) =>
      events.map((event) => ({
        ...event,
        centerLat: event.centerLat ?? 30.0444,
        centerLng: event.centerLng ?? 31.2357,
        radiusMeters: event.radiusMeters ?? 100,
      }))
    ),
    listClubCommittees(isAdmin ? undefined : access.user.committeeId),
  ]);
  return (
    <main id="main-content" className="inner-page">
      <section className="content-section page-intro">
        <div className="section-heading"><p className="eyebrow">{t("eyebrow")}</p><h1>{t("title")}</h1><p className="section-lead">{t("lead")}</p></div>
        <AdminEventManager initialEvents={events} committees={committees} isAdmin={isAdmin} />
      </section>
    </main>
  );
}
