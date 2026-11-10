import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit log" };

export default async function AuditLogPage() {
  const access = await requirePermission("audit.read");
  if ("error" in access) redirect("/dashboard");
  const entries = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true, email: true } } },
  });
  return (
    <main id="main-content" className="inner-page">
      <section className="content-section page-intro">
        <div className="section-heading"><p className="eyebrow">ADMINISTRATION</p><h1>Audit log</h1><p className="section-lead">Recent account and club-management actions.</p></div>
        <div className="audit-table-wrap"><table className="audit-table">
          <thead><tr><th scope="col">When</th><th scope="col">Actor</th><th scope="col">Action</th><th scope="col">Target</th><th scope="col">Details</th></tr></thead>
          <tbody>{entries.map((entry) => <tr key={entry.id}>
            <td>{entry.createdAt.toLocaleString()}</td>
            <td>{entry.actor?.name ?? "System"}{entry.actor?.email ? <small>{entry.actor.email}</small> : null}</td>
            <td>{entry.action.replaceAll(".", " ")}</td>
            <td>{entry.targetType}{entry.targetId ? <small>{entry.targetId}</small> : null}</td>
            <td>{entry.details ? JSON.stringify(entry.details) : "—"}</td>
          </tr>)}
            {!entries.length && <tr><td colSpan={5}>No audit events have been recorded.</td></tr>}
          </tbody>
        </table></div>
      </section>
    </main>
  );
}
