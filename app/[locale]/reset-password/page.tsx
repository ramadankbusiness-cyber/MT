import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ResetPasswordForm } from "@/components/password-reset-forms";
import { getTranslations } from "next-intl/server";

type ResetPasswordPageProps = { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> };

export async function generateMetadata({ params }: ResetPasswordPageProps) {
  const { locale } = await params;
  return { title: locale === "ar" ? "اختار كلمة مرور جديدة" : "Choose a new password" };
}

export default async function ResetPasswordPage({ params, searchParams }: ResetPasswordPageProps) {
  const [{ locale }, { token = "" }] = await Promise.all([params, searchParams]);
  const t = await getTranslations({ locale, namespace: "site.passwordReset" });
  return (
    <main id="main-content" className="login-page">
      <div className="login-glow login-glow-a" aria-hidden="true" />
      <div className="login-glow login-glow-b" aria-hidden="true" />
      <section className="login-card" aria-labelledby="reset-password-title">
        <div className="login-brand"><Image src="/mt-logo.png" alt="" width={42} height={42} priority /><span>MT Club</span></div>
        <h1 id="reset-password-title">{t("newTitle")}</h1>
        <p className="login-subtitle">{t("newLead")}</p>
        <ResetPasswordForm token={token} />
        <Link className="login-inline-link" href="/login">{t("backToLogin")}</Link>
      </section>
    </main>
  );
}
