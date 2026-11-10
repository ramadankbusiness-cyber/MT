import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ForgotPasswordForm } from "@/components/password-reset-forms";
import { getTranslations } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return { title: locale === "ar" ? "إعادة تعيين كلمة المرور" : "Forgot password" };
}

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site.passwordReset" });
  return (
    <main id="main-content" className="login-page">
      <div className="login-glow login-glow-a" aria-hidden="true" />
      <div className="login-glow login-glow-b" aria-hidden="true" />
      <section className="login-card" aria-labelledby="forgot-password-title">
        <div className="login-brand"><Image src="/mt-logo.png" alt="" width={42} height={42} priority /><span>MT Club</span></div>
        <h1 id="forgot-password-title">{t("requestTitle")}</h1>
        <p className="login-subtitle">{t("requestLead")}</p>
        <ForgotPasswordForm />
        <Link className="login-inline-link" href="/login">{t("backToLogin")}</Link>
      </section>
    </main>
  );
}
