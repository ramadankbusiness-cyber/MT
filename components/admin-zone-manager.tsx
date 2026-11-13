"use client";

import dynamic from "next/dynamic";
import { FormEvent, useState } from "react";
import { useAppToast } from "@/components/app-toast-provider";
import { useTranslations } from "next-intl";
import { CommitteeSelect } from "@/components/committee-select";

const ZoneMapPicker = dynamic(() => import("./zone-map-picker"), { ssr: false, loading: () => <div className="zone-map-loading">Loading OpenStreetMap…</div> });
type DbCommittee = { id: string; key: string; name: string; nameAr: string };
type Zone = { id: string; name: string; latitude: number; longitude: number; radiusMeters: number; committeeId: string | null; committee: { name: string } | null };
const defaultPoint = { latitude: 30.0444, longitude: 31.2357 };

export function AdminZoneManager({ initialZones, committees }: { initialZones: Zone[]; committees: DbCommittee[] }) {
  const t = useTranslations("site.adminPages.zones");
  const showToast = useAppToast();
  const [zones, setZones] = useState(initialZones);
  const [name, setName] = useState("");
  const [point, setPoint] = useState(defaultPoint);
  const [radiusMeters, setRadiusMeters] = useState(100);
  const [committeeId, setCommitteeId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function editZone(zone: Zone) {
    setEditingId(zone.id);
    setName(zone.name);
    setPoint({ latitude: zone.latitude, longitude: zone.longitude });
    setRadiusMeters(zone.radiusMeters);
    setCommitteeId(zone.committeeId ?? "");
  }

  function clearForm() {
    setEditingId(null);
    setName("");
    setPoint(defaultPoint);
    setRadiusMeters(100);
    setCommitteeId("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(editingId ? `/api/admin/zones/${editingId}` : "/api/admin/zones", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ...point, radiusMeters, committeeId: committeeId || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error("save-failed");
      setZones((current) => editingId
        ? current.map((zone) => zone.id === editingId ? result.zone : zone)
        : [...current, result.zone]);
      clearForm();
    } catch {
      const errorMessage = t("saveError");
      setMessage(errorMessage);
      showToast(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  async function remove(zone: Zone) {
    if (!window.confirm(t("deleteConfirm", { name: zone.name }))) return;
    const response = await fetch(`/api/admin/zones/${zone.id}`, { method: "DELETE" });
    if (!response.ok) {
      const errorMessage = t("deleteError");
      setMessage(errorMessage);
      showToast(errorMessage);
    } else setZones((current) => current.filter((entry) => entry.id !== zone.id));
  }

  return (
    <div className="admin-events">
      <form className="team-edit-form" onSubmit={save}>
        <h2>{editingId ? t("edit") : t("createTitle")}</h2>
        <p className="empty-note">{t("mapHint")}</p>
        <ZoneMapPicker {...point} radiusMeters={radiusMeters} onPick={setPoint} />
        <div className="admin-form-grid">
          <label>{t("name")}<input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={100} /></label>
          <label>{t("committee")}<CommitteeSelect
            committees={committees}
            value={committeeId}
            onChange={(v) => setCommitteeId(Array.isArray(v) ? "" : (v ?? ""))}
            mode="single"
            showAll={true}
            allLabel={t("all")}
          /></label>
          <label>{t("latitude")}<input type="number" step="any" min={-90} max={90} value={point.latitude} onChange={(event) => setPoint({ ...point, latitude: Number(event.target.value) })} required /></label>
          <label>{t("longitude")}<input type="number" step="any" min={-180} max={180} value={point.longitude} onChange={(event) => setPoint({ ...point, longitude: Number(event.target.value) })} required /></label>
          <label>{t("radius")}<input type="number" min={5} max={5000} value={radiusMeters} onChange={(event) => setRadiusMeters(Number(event.target.value))} required /></label>
        </div>
        {message && <p className="form-error" role="alert">{message}</p>}
        <div className="form-actions"><button className="button button-primary" disabled={busy}>{busy ? t("saving") : editingId ? t("save") : t("create")}</button>{editingId && <button type="button" className="button button-secondary" onClick={clearForm}>{t("cancel")}</button>}</div>
      </form>
      <section className="team-edit-form">
        <h2>{t("saved")}</h2>
        <div className="user-admin-list">{zones.map((zone) => <article className="user-admin-row" key={zone.id}>
          <div className="user-admin-identity"><strong>{zone.name}</strong><span>{zone.latitude.toFixed(5)}, {zone.longitude.toFixed(5)} · {zone.radiusMeters} m</span></div>
          <div className="user-admin-status"><span>{zone.committee?.name ?? t("all")}</span></div>
          <div className="user-admin-actions"><button type="button" className="button button-secondary" onClick={() => editZone(zone)}>{t("editButton")}</button><button type="button" className="button button-secondary danger-button" onClick={() => void remove(zone)}>{t("delete")}</button></div>
        </article>)}
          {!zones.length && <p className="empty-note">{t("empty")}</p>}
        </div>
      </section>
    </div>
  );
}
