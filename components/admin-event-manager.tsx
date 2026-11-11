"use client";

import { FormEvent, useState } from "react";
import { useAppToast } from "@/components/app-toast-provider";
import { useLocale, useTranslations } from "next-intl";
import { getCommitteeLabel } from "@/data/committees";
import ZoneCapture, { type ZoneCaptureValue } from "@/components/zone-capture";

type Committee = { id: string; name: string };
export type ManagedEvent = {
  id: string;
  title: string;
  titleAr: string | null;
  description: string;
  descriptionAr: string | null;
  startsAt: string | Date;
  endsAt: string | Date | null;
  location: string | null;
  committeeId: string | null;
  committee: { id: string; name: string } | null;
  published: boolean;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  locationAccuracy: number | null;
  placeName: string | null;
};

const emptyForm = {
  title: "",
  titleAr: "",
  description: "",
  descriptionAr: "",
  startsAt: "",
  endsAt: "",
  location: "",
  committeeId: "",
  published: true,
  centerLat: 30.0444,
  centerLng: 31.2357,
  radiusMeters: 100,
  locationAccuracy: null as number | null,
  placeName: null as string | null,
};
const localInput = (date: string | Date | null) => date ? new Date(date).toISOString().slice(0, 16) : "";

export function AdminEventManager({ initialEvents, committees, isAdmin }: { initialEvents: ManagedEvent[]; committees: Committee[]; isAdmin: boolean }) {
  const showToast = useAppToast();
  const t = useTranslations("site.pages.eventManager");
  const locale = useLocale();
  const [events, setEvents] = useState(initialEvents);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [formLanguage, setFormLanguage] = useState<"en" | "ar">("en");
  const [zoneValue, setZoneValue] = useState<ZoneCaptureValue>({ latitude: 30.0444, longitude: 31.2357, radiusMeters: 100, accuracy: null, placeName: null, saveAsZone: false, zoneName: null, zoneId: null });

  function editEvent(event: ManagedEvent) {
    setEditingId(event.id);
    setForm({
      title: event.title, titleAr: event.titleAr ?? "", description: event.description, descriptionAr: event.descriptionAr ?? "", startsAt: localInput(event.startsAt),
      endsAt: localInput(event.endsAt), location: event.location ?? "", committeeId: event.committeeId ?? "", published: event.published,
      centerLat: event.centerLat ?? 30.0444, centerLng: event.centerLng ?? 31.2357, radiusMeters: event.radiusMeters ?? 100, locationAccuracy: event.locationAccuracy ?? null, placeName: event.placeName ?? null,
    });
    setZoneValue({ latitude: event.centerLat ?? 30.0444, longitude: event.centerLng ?? 31.2357, radiusMeters: event.radiusMeters ?? 100, accuracy: event.locationAccuracy ?? null, placeName: event.placeName ?? null, saveAsZone: false, zoneName: null, zoneId: null });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const payload = {
        ...form, startsAt: new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        location: form.location || null, committeeId: isAdmin ? form.committeeId || null : committees[0]?.id,
        centerLat: zoneValue.latitude, centerLng: zoneValue.longitude, radiusMeters: zoneValue.radiusMeters,
        locationAccuracy: zoneValue.accuracy, placeName: form.placeName || null,
      };
      const response = await fetch(editingId ? `/api/events/${editingId}` : "/api/events", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? t("saveError"));
      setEvents((current) => editingId
        ? current.map((item) => item.id === editingId ? result.event : item).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
        : [...current, result.event].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()));
      setForm(emptyForm);
      setEditingId(null);
      setFormLanguage("en");
      setZoneValue({ latitude: 30.0444, longitude: 31.2357, radiusMeters: 100, accuracy: null, placeName: null, saveAsZone: false, zoneName: null, zoneId: null });
    } catch {
      const errorMessage = t("saveError");
      setMessage(errorMessage);
      showToast(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  async function remove(event: ManagedEvent) {
    if (!window.confirm(t("deleteConfirm", { title: event.title }))) return;
    const response = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) setMessage(result.error ?? t("deleteError"));
    else setEvents((current) => current.filter((entry) => entry.id !== event.id));
  }

  return (
    <div className="admin-events">
      <form className="team-edit-form" onSubmit={save}>
        <h2>{editingId ? t("edit") : t("create")}</h2>
        <div className="language-tabs" role="tablist" aria-label="Event language">
          <button type="button" role="tab" aria-selected={formLanguage === "en"} onClick={() => setFormLanguage("en")}>{t("english")}</button>
          <button type="button" role="tab" aria-selected={formLanguage === "ar"} onClick={() => setFormLanguage("ar")}>{t("arabic")}</button>
        </div>
        <div className="admin-form-grid">
          {formLanguage === "en"
            ? <label>{t("titleEn")}<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required maxLength={120} /></label>
            : <label lang="ar">{t("titleAr")}<input value={form.titleAr} onChange={(event) => setForm({ ...form, titleAr: event.target.value })} dir="rtl" maxLength={120} /></label>}
          <label>{t("starts")}<input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} required /></label>
          <label>{t("ends")}<input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></label>
          <label>{t("location")}<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} maxLength={250} /></label>
          <ZoneCapture value={{ ...zoneValue, placeName: form.placeName }} onChange={(value) => setZoneValue(value)} />
          <label>{t("placeName")}<input value={form.placeName ?? ""} onChange={(event) => setForm({ ...form, placeName: event.target.value || null })} maxLength={100} /></label>
          {isAdmin && <label>{t("committee")}<select value={form.committeeId} onChange={(event) => setForm({ ...form, committeeId: event.target.value })}><option value="">{t("allMembers")}</option>{committees.map((committee) => <option value={committee.id} key={committee.id}>{getCommitteeLabel(committee.name, locale as "en" | "ar")}</option>)}</select></label>}
          {formLanguage === "en"
            ? <label className="admin-form-wide">{t("descriptionEn")}<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required maxLength={2000} rows={4} /></label>
            : <label className="admin-form-wide" lang="ar">{t("descriptionAr")}<textarea value={form.descriptionAr} onChange={(event) => setForm({ ...form, descriptionAr: event.target.value })} dir="rtl" maxLength={2000} rows={4} /></label>}
          <label className="visibility-control"><input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} />{t("publish")}</label>
        </div>
        {message && <p className="form-error" role="alert">{message}</p>}
        <div className="form-actions"><button className="button button-primary" type="submit" disabled={busy}>{busy ? t("saving") : editingId ? t("save") : t("createButton")}</button>{editingId && <button className="button button-secondary" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>{t("cancel")}</button>}</div>
      </form>
      <section className="team-edit-form">
        <h2>{t("events")}</h2>
        <div className="user-admin-list">{events.map((item) => <article className="user-admin-row" key={item.id}>
          <div className="user-admin-identity"><strong>{locale === "ar" ? item.titleAr || item.title : item.title}</strong><span>{new Date(item.startsAt).toLocaleString(locale)} · {item.location || t("noLocation")}</span></div>
          <div className="user-admin-status"><span>{item.committee ? getCommitteeLabel(item.committee.name, locale as "en" | "ar") : t("allMembers")}</span><span>{item.published ? t("published") : t("draft")}</span></div>
          <div className="user-admin-actions"><button className="button button-secondary" type="button" onClick={() => editEvent(item)}>{t("editButton")}</button>{isAdmin && <button className="button button-secondary danger-button" type="button" onClick={() => void remove(item)}>{t("delete")}</button>}</div>
        </article>)}
          {!events.length && <p className="empty-note">{t("empty")}</p>}
        </div>
      </section>
    </div>
  );
}
