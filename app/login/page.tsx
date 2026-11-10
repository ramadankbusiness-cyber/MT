import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/login-form";
import { safeReturnPath } from "@/lib/login";

export const metadata = { title: "Log in" };

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string | string[]; message?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [session, query] = await Promise.all([auth(), searchParams]);
  if (session?.user?.id) {
    redirect(session.user.mustChangePassword ? "/change-password" : "/dashboard");
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
        <h1 id="login-title">Welcome <span className="gradient-text">back</span></h1>
        <p className="login-subtitle">Log in to access your club account.</p>
        {notice === "login-required" && <p className="login-notice" role="status">Please log in to continue to that page.</p>}
        <LoginForm callbackUrl={callbackUrl} />
        <p className="login-footnote">Don&apos;t have an account? Ask your club admin.</p>
      </section>
    </main>
  );
}
