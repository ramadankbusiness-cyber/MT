import Image from "next/image";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/password-reset-forms";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <main id="main-content" className="login-page">
      <div className="login-glow login-glow-a" aria-hidden="true" />
      <div className="login-glow login-glow-b" aria-hidden="true" />
      <section className="login-card" aria-labelledby="forgot-password-title">
        <div className="login-brand"><Image src="/mt-logo.png" alt="" width={42} height={42} priority /><span>MT Club</span></div>
        <h1 id="forgot-password-title">Reset your password</h1>
        <p className="login-subtitle">Enter the email linked to your club account and we&apos;ll send a reset link.</p>
        <ForgotPasswordForm />
        <Link className="login-inline-link" href="/login">Back to log in</Link>
      </section>
    </main>
  );
}
