"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PushSettings } from "@/components/push-settings";

const types = ["ANNOUNCEMENT", "NEW_EVENT", "EVENT_REMINDER", "SESSION_OPENED", "ATTENDANCE_CONFIRMED", "ATTENDANCE_REJECTED", "ABSENCE_WARNING", "ACCOUNT_CREATED", "PASSWORD_CHANGED", "ROLE_CHANGED", "EXCUSE_DECISION"];
type InboxItem = {
  id: string;
  readAt: string | null;
  notification: { id: string; title: string; message: string; link: string | null; type: string; important: boolean; createdAt: string };
};
type Preference = { type: string; inApp: boolean; push: boolean };

export function NotificationCenter() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [type, setType] = useState("");
  const [message, setMessage] = useState("");
  const [preferences, setPreferences] = useState<Preference[]>([]);

  async function refresh(filter = type) {
    const query = filter ? `?type=${encodeURIComponent(filter)}` : "";
    const response = await fetch(`/api/notifications${query}`, { cache: "no-store" });
    if (!response.ok) {
      setMessage("Could not load notifications. Please try again.");
      return;
    }
    const result = await response.json();
    setItems(result.notifications);
    setUnreadCount(result.unreadCount);
  }

  useEffect(() => {
    void refresh("");
    fetch("/api/notifications/preferences").then(async (response) => {
      if (response.ok) setPreferences((await response.json()).preferences);
    });
  }, []);

  async function act(item: InboxItem, action: "read" | "unread" | "delete") {
    const response = await fetch(`/api/notifications/${item.notification.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!response.ok) {
      setMessage("That notification could not be updated.");
      return;
    }
    await refresh();
  }

  async function markAllRead() {
    const response = await fetch("/api/notifications/read-all", { method: "POST" });
    if (!response.ok) setMessage("Could not mark notifications as read.");
    else await refresh();
  }

  async function updatePreference(preference: Preference, key: "inApp" | "push") {
    const next = { ...preference, [key]: !preference[key] };
    const response = await fetch("/api/notifications/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!response.ok) {
      setMessage("Could not save your notification preference.");
      return;
    }
    setPreferences((current) => current.map((item) => item.type === next.type ? next : item));
    await refresh();
  }

  return (
    <div className="notification-center">
      <div className="notification-toolbar">
        <label>Filter by type<select value={type} onChange={(event) => { setType(event.target.value); void refresh(event.target.value); }}><option value="">All notifications</option>{types.map((item) => <option value={item} key={item}>{item.replaceAll("_", " ").toLowerCase()}</option>)}</select></label>
        <button className="button button-secondary" type="button" disabled={!unreadCount} onClick={() => void markAllRead()}>Mark all read</button>
      </div>
      {message && <p className="form-message" role="status">{message}</p>}
      <div className="notification-list">
        {items.map((item) => (
          <article className={`notification-item${item.readAt ? " is-read" : ""}`} key={item.id}>
            <div className="notification-item-copy">
              <div className="notification-item-title">{item.notification.important && <span className="important-tag">Important</span>}<span className="notification-type">{item.notification.type.replaceAll("_", " ")}</span></div>
              <h2>{item.notification.title}</h2><p>{item.notification.message}</p>
              <time dateTime={item.notification.createdAt}>{new Date(item.notification.createdAt).toLocaleString()}</time>
              {item.notification.link && <Link href={item.notification.link}>Open update →</Link>}
            </div>
            <div className="notification-item-actions">
              <button type="button" onClick={() => void act(item, item.readAt ? "unread" : "read")}>{item.readAt ? "Mark unread" : "Mark read"}</button>
              <button type="button" onClick={() => void act(item, "delete")}>Delete</button>
            </div>
          </article>
        ))}
        {!items.length && <div className="empty-events"><h2>No notifications</h2><p>Updates from the club will appear here.</p></div>}
      </div>

      <section className="notification-preferences">
        <h2>Delivery preferences</h2>
        <p>Choose which categories appear in your inbox or are sent to this device.</p>
        <div className="preference-table-wrap"><table className="preference-table"><thead><tr><th>Type</th><th>In-app</th><th>Push</th></tr></thead><tbody>
          {preferences.map((preference) => <tr key={preference.type}><th scope="row">{preference.type.replaceAll("_", " ").toLowerCase()}</th><td><input aria-label={`${preference.type} in-app notifications`} type="checkbox" checked={preference.inApp} onChange={() => void updatePreference(preference, "inApp")} /></td><td><input aria-label={`${preference.type} push notifications`} type="checkbox" checked={preference.push} onChange={() => void updatePreference(preference, "push")} /></td></tr>)}
        </tbody></table></div>
        <PushSettings />
      </section>
    </div>
  );
}
