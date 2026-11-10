"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Mail } from "lucide-react";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/schemas";

function isValidPassword(value: string) {
  return resetPasswordSchema.shape.newPassword.safeParse(value).success;
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) throw new Error("Reset request failed");
      setSent(true);
    } catch {
      setError("We couldn’t process your request right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return <p className="login-message login-success" role="status" aria-live="polite">If the account exists, we sent a reset link.</p>;
  }

  return (
    <form className="login-form" onSubmit={submit} noValidate>
      <div className="login-field">
        <label htmlFor="reset-email">Email</label>
        <div className="login-input-wrap">
          <Mail size={18} aria-hidden="true" />
          <input id="reset-email" name="email" type="email" autoComplete="email" autoFocus maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
      </div>
      {error && <p className="login-message" role="alert" aria-live="polite">{error}</p>}
      <button className="button button-primary login-submit" type="submit" disabled={busy}>
        {busy ? <><LoaderCircle size={17} className="login-spinner" aria-hidden="true" /> Sending…</> : "Send reset link"}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!isValidPassword(password)) {
      setError("Use at least 12 characters with uppercase, lowercase, and a number.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "This reset link is invalid or expired.");
        return;
      }
      setDone(true);
      window.setTimeout(() => router.replace("/login"), 1200);
    } catch {
      setError("We couldn’t reset your password right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) return <p className="login-message login-success" role="status" aria-live="polite">Your password has been updated. Redirecting to log in…</p>;

  return (
    <form className="login-form" onSubmit={submit} noValidate>
      <div className="login-field">
        <label htmlFor="new-password">New password</label>
        <div className="login-input-wrap">
          <input id="new-password" name="new-password" type="password" autoComplete="new-password" autoFocus maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        <p className="login-password-rules">At least 12 characters, including uppercase, lowercase, and a number.</p>
      </div>
      {error && <p className="login-message" role="alert" aria-live="polite">{error}</p>}
      <button className="button button-primary login-submit" type="submit" disabled={busy}>
        {busy ? <><LoaderCircle size={17} className="login-spinner" aria-hidden="true" /> Saving…</> : "Reset password"}
      </button>
    </form>
  );
}
