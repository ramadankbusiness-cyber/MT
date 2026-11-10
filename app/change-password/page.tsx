import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/change-password-form";
import { getCurrentUser } from "@/lib/auth-guards";
import { SectionHeading } from "@/components/section-heading";

export const metadata = { title: "Change password" };
export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user?.isActive) redirect("/login");
  if (!user.mustChangePassword) redirect("/dashboard");
  return (
    <main id="main-content" className="inner-page">
      <section className="content-section page-intro account-page">
        <SectionHeading eyebrow="ACCOUNT SECURITY" title="Choose a new password." lead="For your security, update the temporary password before continuing." />
        <ChangePasswordForm />
      </section>
    </main>
  );
}
