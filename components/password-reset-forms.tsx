"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { LoaderCircle, Mail } from "lucide-react";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/schemas";
import { useAppToast } from "@/components/app-toast-provider";
import { useTranslations } from "next-intl";

function isValidPassword(value: string) {
  return resetPasswordSchema.shape.newPassword.safeParse(value).success;
}

export function ForgotPasswordForm() {
  const t = useTranslations("site.passwordReset");
  const showToast = useAppToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(t("invalidEmail"));
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
      const errorMessage = t("requestFailed");
      setError(errorMessage);
      showToast(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return <p className="login-message login-success" role="status" aria-live="polite">{t("sent")}</p>;
  }

  return (
    <form className="login-form" onSubmit={submit} noValidate>
      <div className="login-field">
        <label htmlFor="reset-email">{t("email")}</label>
        <div className="login-input-wrap">
          <Mail size={18} aria-hidden="true" />
          <input id="reset-email" name="email" type="email" autoComplete="email" autoFocus maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
      </div>
      {error && <p className="login-message" role="alert" aria-live="polite">{error}</p>}
      <button className="button button-primary login-submit" type="submit" disabled={busy}>
        {busy ? <><LoaderCircle size={17} className="login-spinner" aria-hidden="true" /> {t("sending")}</> : t("send")}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("site.passwordReset");
  const router = useRouter();
  const showToast = useAppToast();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!isValidPassword(password)) {
      setError(t("invalidPassword"));
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (!response.ok) {
        const errorMessage = t("invalidLink");
        setError(errorMessage);
        showToast(errorMessage);
        return;
      }
      setDone(true);
      window.setTimeout(() => router.replace("/login"), 1200);
    } catch {
      const errorMessage = t("resetFailed");
      setError(errorMessage);
      showToast(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  if (done) return <p className="login-message login-success" role="status" aria-live="polite">{t("updated")}</p>;

  return (
    <form className="login-form" onSubmit={submit} noValidate>
      <div className="login-field">
        <label htmlFor="new-password">{t("newPassword")}</label>
        <div className="login-input-wrap">
          <input id="new-password" name="new-password" type="password" autoComplete="new-password" autoFocus maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        <p className="login-password-rules">{t("rules")}</p>
      </div>
      {error && <p className="login-message" role="alert" aria-live="polite">{error}</p>}
      <button className="button button-primary login-submit" type="submit" disabled={busy}>
        {busy ? <><LoaderCircle size={17} className="login-spinner" aria-hidden="true" /> {t("saving")}</> : t("reset")}
      </button>
    </form>
  );
}
