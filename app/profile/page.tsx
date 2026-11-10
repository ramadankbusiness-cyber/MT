import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";
import { requirePermission } from "@/lib/auth-guards";

export const metadata = { title: "My profile" };

export default async function ProfilePage() {
  const access = await requirePermission("profile.read.own");
  if ("error" in access) redirect("/login?message=login-required");
  return (
    <main id="main-content" className="inner-page">
      <section className="content-section page-intro">
        <div className="section-heading"><p className="eyebrow">YOUR ACCOUNT</p><h1>My profile</h1><p className="section-lead">Update your contact details, photo, and password.</p></div>
        <ProfileForm initialName={access.user.name} email={access.user.email} initialPhone={access.user.phone} initialPhoto={access.user.photoUrl} />
      </section>
    </main>
  );
}
