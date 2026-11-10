import { redirect } from "next/navigation";
import { permissionRows } from "@/lib/permissions";
import { requirePermission } from "@/lib/auth-guards";

export const metadata = { title: "Permissions matrix" };

export default async function PermissionsPage() {
  const access = await requirePermission("permissions.read");
  if ("error" in access) redirect(access.status === 401 ? "/login?message=login-required" : "/forbidden");
  const rows = permissionRows();
  const permissions = [...new Set(rows.flatMap((row) => row.permissions))].sort();
  return (
    <main id="main-content" className="inner-page">
      <section className="content-section page-intro">
        <div className="section-heading"><p className="eyebrow">ADMINISTRATION</p><h1>Permissions matrix</h1><p className="section-lead">A read-only view of the centrally enforced capabilities for each account role.</p></div>
        <div className="permissions-table-wrap"><table className="permissions-table">
          <thead><tr><th scope="col">Capability</th>{rows.map((row) => <th scope="col" key={row.role}>{row.role}</th>)}</tr></thead>
          <tbody>{permissions.map((permission) => <tr key={permission}><th scope="row">{permission.replaceAll(".", " · ")}</th>{rows.map((row) => <td key={row.role}>{new Set<string>(row.permissions).has(permission) ? <span className="permission-yes" aria-label="Allowed">✓</span> : <span aria-label="Not allowed">—</span>}</td>)}</tr>)}</tbody>
        </table></div>
      </section>
    </main>
  );
}
