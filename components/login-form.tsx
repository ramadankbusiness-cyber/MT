"use client";

import { signIn, getSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, KeyRound, Mail, LoaderCircle } from "lucide-react";
import { loginSchema } from "@/lib/schemas";
import { getLoginErrorReference, getPostLoginPath, isCredentialSignInFailure, isSignInSuccess } from "@/lib/login";
import { useAppToast } from "@/components/app-toast-provider";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type LoginFormProps = { callbackUrl: string | null };
type FieldErrors = { email?: string; password?: string };

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const showToast = useAppToast();
  const t = useTranslations("site.login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");

  function validateFields() {
    const parsed = loginSchema.safeParse({ email, password, rememberMe });
    const nextErrors: FieldErrors = {};
    for (const issue of parsed.error?.issues ?? []) {
      const field = issue.path[0];
      if ((field === "email" || field === "password") && !nextErrors[field]) nextErrors[field] = field === "email" ? t("invalidEmail") : t("enterPassword");
    }
    setErrors(nextErrors);
    return parsed.success;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!validateFields()) return;

    setBusy(true);
    try {
      const postLoginPath = getPostLoginPath(false, callbackUrl);
      const result = await signIn("credentials", {
        email,
        password,
        rememberMe,
        callbackUrl: postLoginPath,
        redirect: false,
      });
      if (!isSignInSuccess(result)) {
        const code = result?.code ?? "";
        const errorReference = getLoginErrorReference(code);
        let errorMessage: string;
        if (code === "account-disabled") errorMessage = t("disabled");
        else if (code.startsWith("try-again-")) {
          const minutes = Number(code.slice("try-again-".length));
          errorMessage = t("tryAgain", { minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 15 });
        } else if (errorReference) errorMessage = t("failureWithId", { id: errorReference });
        else if (isCredentialSignInFailure(result)) errorMessage = t("incorrect");
        else errorMessage = t("failure");
        setMessage(errorMessage);
        showToast(errorMessage);
        return;
      }

      const session = await getSession();
      router.replace(getPostLoginPath(session?.user.mustChangePassword ?? false, postLoginPath));
      router.refresh();
    } catch {
      const errorId = crypto.randomUUID().slice(0, 8);
      console.error("[login] unexpected failure", errorId);
      const errorMessage = t("failureWithId", { id: errorId });
      setMessage(errorMessage);
      showToast(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="login-form" onSubmit={submit} noValidate>
      <div className="login-field">
        <label htmlFor="login-email">{t("email")}</label>
        <div className={`login-input-wrap${errors.email ? " has-error" : ""}`}>
          <Mail size={18} aria-hidden="true" />
          <input
            id="login-email"
            name="email"
            type="email"
            value={email}
            autoComplete="email"
            autoFocus
            maxLength={254}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            onChange={(event) => {
              setEmail(event.target.value);
              if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
            }}
            onBlur={() => {
              if (email && !loginSchema.shape.email.safeParse(email).success) setErrors((current) => ({ ...current, email: t("invalidEmail") }));
            }}
          />
        </div>
        {errors.email && <span className="login-field-error" id="login-email-error">{errors.email}</span>}
      </div>

      <div className="login-field">
        <div className="login-label-row">
          <label htmlFor="login-password">{t("password")}</label>
          <Link href="/forgot-password">{t("forgot")}</Link>
        </div>
        <div className={`login-input-wrap${errors.password ? " has-error" : ""}`}>
          <KeyRound size={18} aria-hidden="true" />
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={password}
            autoComplete="current-password"
            maxLength={128}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "login-password-error" : undefined}
            onChange={(event) => {
              setPassword(event.target.value);
              if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
            }}
          />
          <button
            className="login-password-toggle"
            type="button"
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
          </button>
        </div>
        {errors.password && <span className="login-field-error" id="login-password-error">{errors.password}</span>}
      </div>

      <label className="login-remember">
        <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
        <span>{t("remember")}</span>
      </label>

      {message && <p className="login-message" role="alert" aria-live="polite">{message}</p>}
      <button className="button button-primary login-submit" type="submit" disabled={busy}>
        {busy ? <><LoaderCircle size={17} className="login-spinner" aria-hidden="true" /> {t("submitting")}</> : t("submit")}
      </button>
    </form>
  );
}
