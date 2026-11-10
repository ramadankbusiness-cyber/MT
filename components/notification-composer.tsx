"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAppToast } from "@/components/app-toast-provider";

type Role = "ADMIN" | "LEADER" | "MEMBER";
type Audience = "EVERYONE" | "ROLE" | "COMMITTEE" | "USERS";
type Committee = { id: string; name: string };
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

const typeOptions = ["ANNOUNCEMENT", "NEW_EVENT", "EVENT_REMINDER", "SESSION_OPENED", "ATTENDANCE_CONFIRMED", "ATTENDANCE_REJECTED", "ABSENCE_WARNING", "ACCOUNT_CREATED", "PASSWORD_CHANGED", "ROLE_CHANGED", "EXCUSE_DECISION"];

export function NotificationComposer({ role, committees, users }: { role: Role; committees: Committee[]; users: UserOption[] }) {
  const showToast = useAppToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [type, setType] = useState("ANNOUNCEMENT");
  const [audience, setAudience] = useState<Audience>(role === "LEADER" ? "COMMITTEE" : "EVERYONE");
  const [audienceRole, setAudienceRole] = useState<Role>("MEMBER");
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
      title, message, link: link || null, type, audience,
      audienceRole: audience === "ROLE" ? audienceRole : undefined,
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
      const deliveryNote = !result.pushConfigured && result.notification.sentAt ? " In-app delivery is active; push delivery is not configured." : "";
      setNotice(`${result.notification.sentAt ? `Notification sent to ${result.recipientCount} recipients.` : "Notification scheduled."}${deliveryNote}`);
      setTitle("");
      setMessage("");
      setLink("");
      setScheduledAt("");
      setImportant(false);
      setPreview(false);
      await loadHistory();
    } catch {
      const errorMessage = "Could not send this notification. Please try again.";
      setNotice(errorMessage);
      showToast(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="notification-composer-layout">
      <form className="team-edit-form notification-compose-form" onSubmit={submit}>
        <h2>Compose an update</h2>
        <div className="admin-form-grid">
          <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} maxLength={120} /></label>
          <label>Type<select value={type} onChange={(event) => setType(event.target.value)}>{typeOptions.map((item) => <option value={item} key={item}>{item.replaceAll("_", " ").toLowerCase()}</option>)}</select></label>
          <label className="admin-form-wide">Message<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} required minLength={2} maxLength={3000} /></label>
          <label>In-app link (optional)<input value={link} onChange={(event) => setLink(event.target.value)} placeholder="/events" /></label>
          <label>Audience<select value={audience} disabled={role === "LEADER"} onChange={(event) => setAudience(event.target.value as Audience)}>
            <option value="EVERYONE">Everyone</option>{role === "ADMIN" && <><option value="ROLE">By role</option><option value="COMMITTEE">By committee</option><option value="USERS">Specific members</option></>}
            {role === "LEADER" && <option value="COMMITTEE">My committee</option>}
          </select></label>
          {audience === "ROLE" && <label>Role<select value={audienceRole} onChange={(event) => setAudienceRole(event.target.value as Role)}><option value="ADMIN">Admin</option><option value="LEADER">Leader</option><option value="MEMBER">Member</option></select></label>}
          {audience === "COMMITTEE" && <label>Committee<select value={committeeId} onChange={(event) => setCommitteeId(event.target.value)} required>{committees.map((committee) => <option value={committee.id} key={committee.id}>{committee.name}</option>)}</select></label>}
          {audience === "USERS" && <label className="admin-form-wide">Recipients<select multiple value={userIds} onChange={(event) => setUserIds(Array.from(event.target.selectedOptions, (option) => option.value))}>{users.map((user) => <option value={user.id} key={user.id}>{user.name} — {user.email}</option>)}</select></label>}
          <label>Schedule (leave blank to send now)<input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></label>
          <label className="visibility-control"><input type="checkbox" checked={important} onChange={(event) => setImportant(event.target.checked)} />Mark as important</label>
        </div>
        <div className="form-actions"><button className="button button-secondary" type="button" onClick={() => setPreview((value) => !value)}>{preview ? "Hide preview" : "Preview"}</button><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Sending…" : scheduledAt ? "Schedule notification" : "Send notification"}</button></div>
        {preview && <aside className="notification-preview-card"><span>{important ? "IMPORTANT · " : ""}{audience.replaceAll("_", " ")}</span><h3>{title || "Your notification title"}</h3><p>{message || "Your message preview appears here."}</p>{link && <code>{link}</code>}</aside>}
        {notice && <p className="form-message" role="status">{notice}</p>}
      </form>

      <section className="team-edit-form notification-history">
        <h2>Sent and scheduled</h2>
        {history.length ? <ul className="dashboard-list">{history.map((item) => <li key={item.id}>
          <strong>{item.title}{item.important ? " · Important" : ""}</strong>
          <span>{item.scheduledAt && !item.sentAt ? `Scheduled for ${new Date(item.scheduledAt).toLocaleString()}` : `Delivered to ${item.deliveredCount} · Read by ${item.readCount}`}</span>
          <p>{item.message}</p>
        </li>)}</ul> : <p className="empty-note">Your sent notification history will appear here.</p>}
      </section>
    </div>
  );
}
