import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/login-form";
import { safeReturnPath } from "@/lib/login";
import { getTranslations } from "next-intl/server";

type LoginPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string | string[]; message?: string | string[] }>;
};

export async function generateMetadata({ params }: LoginPageProps) {
  const { locale } = await params;
  return { title: locale === "ar" ? "تسجيل الدخول" : "Log in" };
}

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const [{ locale }, session, query] = await Promise.all([params, auth(), searchParams]);
  const t = await getTranslations({ locale, namespace: "site.login" });
  if (session?.user?.id) {
    redirect(`/${locale}/${session.user.mustChangePassword ? "change-password" : "dashboard"}`);
  }
  const callbackUrl = safeReturnPath(Array.isArray(query.callbackUrl) ? query.callbackUrl[0] : query.callbackUrl);
  const notice = Array.isArray(query.message) ? query.message[0] : query.message;

  return (
    <main id="main-content" className="login-page">
      <div className="login-glow login-glow-a" aria-hidden="true" />
      <div className="login-glow login-glow-b" aria-hidden="true" />
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <Image src="/mt-logo.png" alt="" width={42} height={42} priority />
          <span>MT Club</span>
        </div>
        <h1 id="login-title">{t("welcome")} <span className="gradient-text">{t("back")}</span></h1>
        <p className="login-subtitle">{t("subtitle")}</p>
        {notice === "login-required" && <p className="login-notice" role="status">{t("required")}</p>}
        <LoginForm callbackUrl={callbackUrl} />
        <p className="login-footnote">{t("noAccount")}</p>
      </section>
    </main>
  );
}
