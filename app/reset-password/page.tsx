import Image from "next/image";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/password-reset-forms";

export const metadata = { title: "Choose a new password" };

type ResetPasswordPageProps = { searchParams: Promise<{ token?: string }> };

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token = "" } = await searchParams;
  return (
    <main id="main-content" className="login-page">
      <div className="login-glow login-glow-a" aria-hidden="true" />
      <div className="login-glow login-glow-b" aria-hidden="true" />
      <section className="login-card" aria-labelledby="reset-password-title">
        <div className="login-brand"><Image src="/mt-logo.png" alt="" width={42} height={42} priority /><span>MT Club</span></div>
        <h1 id="reset-password-title">Choose a new password</h1>
        <p className="login-subtitle">Create a new password to secure your club account.</p>
        <ResetPasswordForm token={token} />
        <Link className="login-inline-link" href="/login">Back to log in</Link>
      </section>
    </main>
  );
}
