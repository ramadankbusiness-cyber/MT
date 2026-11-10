"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { CLUB_COMMITTEES } from "@/data/committees";
import { joinApplicationSchema } from "@/lib/schemas";
import { useSite } from "./site-provider";
import { useAppToast } from "@/components/app-toast-provider";

type FormFields = { name: string; email: string; committees: string[]; message: string };
const initialForm: FormFields = { name: "", email: "", committees: [], message: "" };

export function JoinForm() {
  const { text } = useSite();
  const showToast = useAppToast();
  const [form, setForm] = useState<FormFields>(initialForm);
  const [committeeChoice, setCommitteeChoice] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    const parsed = joinApplicationSchema.safeParse(form);
    if (!parsed.success) {
      const committeeIssue = parsed.error.issues.some((issue) => issue.path[0] === "committees");
      const emailIssue = parsed.error.issues.some((issue) => issue.path[0] === "email");
      setErrorMessage(emailIssue ? text.join.invalidEmail : committeeIssue ? "Choose between 1 and 3 committees." : text.join.required);
      return;
    }

    setStatus("sending");
    try {
      const response = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) throw new Error("Join request failed");
      setForm(initialForm);
      setCommitteeChoice("");
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage(text.join.error);
      showToast(text.join.error);
    }
  }

  function addCommittee(value: string) {
    if (!value) return;
    if (form.committees.length >= 3) {
      setErrorMessage("You can choose up to 3 committees.");
      setCommitteeChoice("");
      return;
    }
    if (!form.committees.includes(value)) {
      setForm((current) => ({ ...current, committees: [...current.committees, value] }));
    }
    setCommitteeChoice("");
    setErrorMessage("");
  }

  function removeCommittee(value: string) {
    setForm((current) => ({ ...current, committees: current.committees.filter((committee) => committee !== value) }));
  }

  function update(field: "name" | "email" | "message", value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  if (status === "success") {
    return <div className="success-panel" role="status"><span className="success-mark" aria-hidden="true">✓</span><h2>{text.join.successTitle}</h2><p>{text.join.successText}</p></div>;
  }

  return (
    <form className="join-form" onSubmit={handleSubmit} noValidate>
      <label>{text.join.name}<input autoComplete="name" name="name" value={form.name} onChange={(event) => update("name", event.target.value)} required maxLength={100} /></label>
      <label>{text.join.email}<input autoComplete="email" name="email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required maxLength={254} /></label>
      <div className="join-committee-field">
        <label htmlFor="join-committee">{text.join.interest}</label>
        <select
          id="join-committee"
          name="committeeChoice"
          value={committeeChoice}
          onChange={(event) => addCommittee(event.target.value)}
          aria-describedby="join-committee-hint"
          required={!form.committees.length}
        >
          <option value="" disabled>Choose a committee</option>
          {CLUB_COMMITTEES.filter((committee) => !form.committees.includes(committee)).map((committee) => (
            <option value={committee} key={committee} disabled={form.committees.length >= 3}>{committee}</option>
          ))}
        </select>
        <span className="join-committee-hint" id="join-committee-hint">Choose up to 3 committees.</span>
        {!!form.committees.length && <ul className="join-committee-pills" aria-label="Selected committees">
          {form.committees.map((committee) => (
            <li key={committee}>
              <span>{committee}</span>
              <button type="button" aria-label={`Remove ${committee}`} onClick={() => removeCommittee(committee)}><X size={14} aria-hidden="true" /></button>
            </li>
          ))}
        </ul>}
      </div>
      <label>{text.join.message}<textarea name="message" rows={5} value={form.message} onChange={(event) => update("message", event.target.value)} placeholder={text.join.messageHint} required maxLength={2000} /></label>
      {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
      <button className="button button-primary button-large form-submit" type="submit" disabled={status === "sending"}>
        {status === "sending" ? text.join.submitting : text.join.submit}<span aria-hidden="true">↗</span>
      </button>
    </form>
  );
}
