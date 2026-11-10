import { redirect } from "next/navigation";
import { AdminZoneManager } from "@/components/admin-zone-manager";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { listClubCommittees } from "@/lib/committees";

export const dynamic = "force-dynamic";
export const metadata = { title: "Attendance zones" };

export default async function AdminZonesPage() {
  const access = await requirePermission("zones.manage");
  if ("error" in access) redirect("/dashboard");
  const [zones, committees] = await Promise.all([
    prisma.zone.findMany({ include: { committee: { select: { name: true } } }, orderBy: { name: "asc" } }),
    listClubCommittees(),
  ]);
  return (
    <main id="main-content" className="inner-page">
      <section className="content-section page-intro">
        <div className="section-heading"><p className="eyebrow">ATTENDANCE SETUP</p><h1>Allowed zones</h1><p className="section-lead">Choose reusable check-in areas and define their geographic radius.</p></div>
        <AdminZoneManager initialZones={zones} committees={committees} />
      </section>
    </main>
  );
}
