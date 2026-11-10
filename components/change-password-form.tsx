"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function ChangePasswordForm() {
  const { update } = useSession();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.get("currentPassword"),
        newPassword: form.get("newPassword"),
      }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(result.error ?? "Could not change your password.");
      return;
    }
    await update();
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form className="account-form" onSubmit={submit}>
      <label>Temporary or current password<input type="password" name="currentPassword" autoComplete="current-password" required /></label>
      <label>New password<input type="password" name="newPassword" autoComplete="new-password" minLength={12} required /></label>
      <p className="form-footnote">Use 12+ characters, including uppercase, lowercase, and a number.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary button-large form-submit" disabled={busy}>{busy ? "Saving…" : "Set new password"}</button>
    </form>
  );
}
