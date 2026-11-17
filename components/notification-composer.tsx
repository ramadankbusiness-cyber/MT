"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAppToast } from "@/components/app-toast-provider";
import { useLocale, useTranslations } from "next-intl";
import { CommitteeSelect } from "@/components/committee-select";

type Role = "ADMIN" | "LEADER" | "MEMBER";
type Position = "HEAD" | "VICE" | "LEADER";
type Audience = "EVERYONE" | "ROLE" | "COMMITTEE" | "USERS" | "MTC" | "POSITION";
type DbCommittee = { id: string; key: string; name: string; nameAr: string };
type UserOption = { id: string; name: string; email: string };
type HistoryItem = {
  id: string;
  title: string;
  message: string;
  audience: Audience;
  sentAt: string | null;
  scheduledAt: string | null;
  important: boolean;
  deliveredCount: number;
  readCount: number;
};

const typeOptions = ["ANNOUNCEMENT", "NEW_EVENT", "EVENT_REMINDER", "SESSION_OPENED", "ATTENDANCE_CONFIRMED", "ATTENDANCE_REJECTED", "ABSENCE_WARNING", "ACCOUNT_CREATED", "PASSWORD_CHANGED", "ROLE_CHANGED", "EXCUSE_DECISION"] as const;

export function NotificationComposer({ role, committees, users }: { role: Role; committees: DbCommittee[]; users: UserOption[] }) {
  const showToast = useAppToast();
  const t = useTranslations("site.notifications");
  const locale = useLocale();
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [message, setMessage] = useState("");
  const [messageAr, setMessageAr] = useState("");
  const [formLanguage, setFormLanguage] = useState<"en" | "ar">("en");
  const [link, setLink] = useState("");
  const [type, setType] = useState("ANNOUNCEMENT");
  const [audience, setAudience] = useState<Audience>(role === "LEADER" ? "COMMITTEE" : "EVERYONE");
  const [audienceRole, setAudienceRole] = useState<Role>("MEMBER");
  const [audiencePosition, setAudiencePosition] = useState<Position>("HEAD");
  const [committeeId, setCommitteeId] = useState(committees[0]?.id ?? "");
  const [userIds, setUserIds] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [important, setImportant] = useState(false);
  const [preview, setPreview] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadHistory() {
    const response = await fetch("/api/notifications?sent=true", { cache: "no-store" });
    if (response.ok) setHistory((await response.json()).notifications);
  }

  useEffect(() => { void loadHistory(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    const payload = {
      title, titleAr: titleAr || null, message, messageAr: messageAr || null, link: link || null, type, audience,
      audienceRole: audience === "ROLE" ? audienceRole : undefined,
      audiencePosition: audience === "POSITION" ? audiencePosition : undefined,
      committeeId: audience === "COMMITTEE" ? committeeId : undefined,
      userIds: audience === "USERS" ? userIds : undefined,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      important,
    };
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not send this notification.");
      const deliveryNote = !result.pushConfigured && result.notification.sentAt ? t("pushNotConfigured") : "";
      setNotice(`${result.notification.sentAt ? t("sent", { count: result.recipientCount }) : t("scheduled")}${deliveryNote}`);
      setTitle("");
      setTitleAr("");
      setMessage("");
      setMessageAr("");
      setLink("");
      setScheduledAt("");
      setImportant(false);
      setPreview(false);
      await loadHistory();
    } catch {
      const errorMessage = t("sendError");
      setNotice(errorMessage);
      showToast(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="notification-composer-layout">
      <form className="team-edit-form notification-compose-form" onSubmit={submit}>
        <h2>{t("composerTitle")}</h2>
        <div className="language-tabs" role="tablist" aria-label={`${t("english")} / ${t("arabic")}`}>
          <button type="button" role="tab" aria-selected={formLanguage === "en"} onClick={() => setFormLanguage("en")}>{t("english")}</button>
          <button type="button" role="tab" aria-selected={formLanguage === "ar"} onClick={() => setFormLanguage("ar")}>{t("arabic")}</button>
        </div>
        <div className="admin-form-grid">
          {formLanguage === "en"
            ? <label>{t("titleEnglish")}<input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} maxLength={120} /></label>
            : <label lang="ar">{t("titleArabic")}<input value={titleAr} onChange={(event) => setTitleAr(event.target.value)} dir="rtl" maxLength={120} /></label>}
          <label>{t("typeLabel")}<select value={type} onChange={(event) => setType(event.target.value)}>{typeOptions.map((item) => <option value={item} key={item}>{t(`typeOptions.${item}`)}</option>)}</select></label>
          {formLanguage === "en"
            ? <label className="admin-form-wide">{t("messageEnglish")}<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} required minLength={2} maxLength={3000} /></label>
            : <label className="admin-form-wide" lang="ar">{t("messageArabic")}<textarea value={messageAr} onChange={(event) => setMessageAr(event.target.value)} dir="rtl" rows={4} maxLength={3000} /></label>}
          <label>{t("link")}<input value={link} onChange={(event) => setLink(event.target.value)} placeholder="/events" /></label>
          <label>{t("audience")}<select value={audience} disabled={role === "LEADER"} onChange={(event) => setAudience(event.target.value as Audience)}>
            <option value="EVERYONE">{t("everyone")}</option>{role === "ADMIN" && <><option value="ROLE">{t("byRole")}</option><option value="COMMITTEE">{t("byCommittee")}</option><option value="MTC">{t("mtcHeads") ?? "MTC (club heads)"}</option><option value="POSITION">{t("byPosition") ?? "By position"}</option><option value="USERS">{t("specificUsers")}</option></>}
            {role === "LEADER" && <option value="COMMITTEE">{t("myCommittee")}</option>}
          </select></label>
          {audience === "ROLE" && <label>{t("role")}<select value={audienceRole} onChange={(event) => setAudienceRole(event.target.value as Role)}><option value="ADMIN">{t("roleOptions.ADMIN")}</option><option value="LEADER">{t("roleOptions.LEADER")}</option><option value="MEMBER">{t("roleOptions.MEMBER")}</option></select></label>}
          {audience === "POSITION" && <label>{t("position") ?? "Position"}<select value={audiencePosition} onChange={(event) => setAudiencePosition(event.target.value as Position)}><option value="HEAD">{locale === "ar" ? "هيد" : "Heads"}</option><option value="VICE">{locale === "ar" ? "فايس" : "Vices"}</option><option value="LEADER">{locale === "ar" ? "ليدر" : "Leaders"}</option></select></label>}
          {audience === "COMMITTEE" && <label>{t("committee")}<CommitteeSelect
            committees={committees}
            includeMTC={role === "ADMIN"}
            value={committeeId}
            onChange={(v) => setCommitteeId(Array.isArray(v) ? "" : (v ?? ""))}
            mode="single"
            required
            disabled={role === "LEADER"}
          /></label>}
          {audience === "USERS" && <label className="admin-form-wide">{t("recipients")}<select multiple value={userIds} onChange={(event) => setUserIds(Array.from(event.target.selectedOptions, (option) => option.value))}>{users.map((user) => <option value={user.id} key={user.id}>{user.name} — {user.email}</option>)}</select></label>}
          <label>{t("schedule")}<input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></label>
          <label className="visibility-control"><input type="checkbox" checked={important} onChange={(event) => setImportant(event.target.checked)} />{t("importantToggle")}</label>
        </div>
        <div className="form-actions"><button className="button button-secondary" type="button" onClick={() => setPreview((value) => !value)}>{preview ? t("hidePreview") : t("preview")}</button><button className="button button-primary" type="submit" disabled={busy}>{busy ? t("sending") : scheduledAt ? t("scheduleButton") : t("send")}</button></div>
        {preview && <aside className="notification-preview-card"><span>{important ? `${t("important")} · ` : ""}{audience === "EVERYONE" ? t("everyone") : audience === "ROLE" ? t("byRole") : audience === "COMMITTEE" ? t("byCommittee") : audience === "MTC" ? (t("mtcHeads") ?? "MTC") : audience === "POSITION" ? (t("byPosition") ?? "Position") : t("specificUsers")}</span><h3>{(formLanguage === "ar" ? titleAr : title) || t("previewTitle")}</h3><p>{(formLanguage === "ar" ? messageAr : message) || t("previewMessage")}</p>{link && <code>{link}</code>}</aside>}
        {notice && <p className="form-message" role="status">{notice}</p>}
      </form>

      <section className="team-edit-form notification-history">
        <h2>{t("history")}</h2>
        {history.length ? <ul className="dashboard-list">{history.map((item) => <li key={item.id}>
          <strong>{item.title}{item.important ? " · Important" : ""}</strong>
          <span>{item.scheduledAt && !item.sentAt ? t("scheduledFor", { date: new Date(item.scheduledAt).toLocaleString(locale) }) : t("deliveredRead", { delivered: item.deliveredCount, read: item.readCount })}</span>
          <p>{item.message}</p>
        </li>)}</ul> : <p className="empty-note">{t("historyEmpty")}</p>}
      </section>
    </div>
  );
}
