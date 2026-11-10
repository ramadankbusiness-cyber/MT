"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { PushSettings } from "@/components/push-settings";
import { useLocale, useTranslations } from "next-intl";

const types = ["ANNOUNCEMENT", "NEW_EVENT", "EVENT_REMINDER", "SESSION_OPENED", "ATTENDANCE_CONFIRMED", "ATTENDANCE_REJECTED", "ABSENCE_WARNING", "ACCOUNT_CREATED", "PASSWORD_CHANGED", "ROLE_CHANGED", "EXCUSE_DECISION"] as const;
type InboxItem = {
  id: string;
  readAt: string | null;
  notification: { id: string; title: string; message: string; link: string | null; type: string; important: boolean; createdAt: string };
};
type Preference = { type: string; inApp: boolean; push: boolean };

export function NotificationCenter() {
  const t = useTranslations("site.notifications");
  const locale = useLocale();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [type, setType] = useState("");
  const [message, setMessage] = useState("");
  const [preferences, setPreferences] = useState<Preference[]>([]);

  async function refresh(filter = type) {
    const query = filter ? `?type=${encodeURIComponent(filter)}` : "";
    const response = await fetch(`/api/notifications${query}`, { cache: "no-store" });
    if (!response.ok) {
      setMessage(t("loadError"));
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
      setMessage(t("updateError"));
      return;
    }
    await refresh();
  }

  async function markAllRead() {
    const response = await fetch("/api/notifications/read-all", { method: "POST" });
    if (!response.ok) setMessage(t("readError"));
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
      setMessage(t("preferenceError"));
      return;
    }
    setPreferences((current) => current.map((item) => item.type === next.type ? next : item));
    await refresh();
  }

  return (
    <div className="notification-center">
      <div className="notification-toolbar">
        <label>{t("filter")}<select value={type} onChange={(event) => { setType(event.target.value); void refresh(event.target.value); }}><option value="">{t("all")}</option>{types.map((item) => <option value={item} key={item}>{t(`typeOptions.${item}`)}</option>)}</select></label>
        <button className="button button-secondary" type="button" disabled={!unreadCount} onClick={() => void markAllRead()}>{t("markAllRead")}</button>
      </div>
      {message && <p className="form-message" role="status">{message}</p>}
      <div className="notification-list">
        {items.map((item) => (
          <article className={`notification-item${item.readAt ? " is-read" : ""}`} key={item.id}>
            <div className="notification-item-copy">
              <div className="notification-item-title">{item.notification.important && <span className="important-tag">{t("important")}</span>}<span className="notification-type">{types.includes(item.notification.type as typeof types[number]) ? t(`typeOptions.${item.notification.type as typeof types[number]}`) : item.notification.type}</span></div>
              <h2>{item.notification.title}</h2><p>{item.notification.message}</p>
              <time dateTime={item.notification.createdAt}>{new Date(item.notification.createdAt).toLocaleString(locale)}</time>
              {item.notification.link && <Link href={item.notification.link}>{t("open")}</Link>}
            </div>
            <div className="notification-item-actions">
              <button type="button" onClick={() => void act(item, item.readAt ? "unread" : "read")}>{item.readAt ? t("markUnread") : t("markRead")}</button>
              <button type="button" onClick={() => void act(item, "delete")}>{t("delete")}</button>
            </div>
          </article>
        ))}
        {!items.length && <div className="empty-events"><h2>{t("emptyTitle")}</h2><p>{t("empty")}</p></div>}
      </div>

      <section className="notification-preferences">
        <h2>{t("preferences")}</h2>
        <p>{t("preferencesHint")}</p>
        <div className="preference-table-wrap"><table className="preference-table"><thead><tr><th>{t("type")}</th><th>{t("inApp")}</th><th>{t("push")}</th></tr></thead><tbody>
          {preferences.map((preference) => {
            const typeLabel = types.includes(preference.type as typeof types[number])
              ? t(`typeOptions.${preference.type as typeof types[number]}`)
              : preference.type;
            return <tr key={preference.type}><th scope="row">{typeLabel}</th><td><input aria-label={t("inAppAria", { type: typeLabel })} type="checkbox" checked={preference.inApp} onChange={() => void updatePreference(preference, "inApp")} /></td><td><input aria-label={t("pushAria", { type: typeLabel })} type="checkbox" checked={preference.push} onChange={() => void updatePreference(preference, "push")} /></td></tr>;
          })}
        </tbody></table></div>
        <PushSettings />
      </section>
    </div>
  );
}
