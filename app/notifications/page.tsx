import { redirect } from "next/navigation";
import { NotificationCenter } from "@/components/notification-center";
import { requirePermission } from "@/lib/auth-guards";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const access = await requirePermission("notifications.read");
  if ("error" in access) redirect("/login");
  return (
    <main id="main-content" className="inner-page">
      <section className="content-section page-intro">
        <div className="section-heading"><p className="eyebrow">YOUR UPDATES</p><h1>Notifications</h1><p className="section-lead">Club announcements and personal updates, all in one place.</p></div>
        <NotificationCenter />
      </section>
    </main>
  );
}
