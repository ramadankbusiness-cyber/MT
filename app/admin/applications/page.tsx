import { redirect } from "next/navigation";
import { AdminApplications } from "@/components/admin-applications";
import { requirePermission } from "@/lib/auth-guards";

export const metadata = { title: "Membership applications" };

export default async function AdminApplicationsPage() {
  const access = await requirePermission("applications.read");
  if ("error" in access) redirect("/dashboard");
  return (
    <main id="main-content" className="inner-page">
      <section className="content-section page-intro">
        <div className="section-heading">
          <p className="eyebrow">MEMBERSHIP</p>
          <h1>Applications</h1>
          <p className="section-lead">Review new member applications and the committees they selected.</p>
        </div>
        <AdminApplications />
      </section>
    </main>
  );
}
