import { redirect } from "next/navigation";
import { AdminUserManager } from "@/components/admin-user-manager";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { listClubCommittees } from "@/lib/committees";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manage accounts" };

export default async function AdminUsersPage() {
  const access = await requirePermission("users.read");
  if ("error" in access) redirect(access.status === 401 ? "/login?message=login-required" : "/forbidden");
  const [users, committees] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true, name: true, email: true, role: true, committeeId: true,
        committee: { select: { name: true } }, isActive: true, mustChangePassword: true,
      },
    }),
    listClubCommittees(),
  ]);
  return (
    <main id="main-content" className="inner-page">
      <section className="content-section page-intro">
        <div className="section-heading"><p className="eyebrow">ADMINISTRATION</p><h1>Account management</h1><p className="section-lead">Create and manage club accounts. Only administrators can provision accounts or assign roles.</p></div>
        <AdminUserManager initialUsers={users} committees={committees} />
      </section>
    </main>
  );
}
