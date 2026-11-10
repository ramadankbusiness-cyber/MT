"use client";

import dynamic from "next/dynamic";
import { FormEvent, useState } from "react";

const ZoneMapPicker = dynamic(() => import("./zone-map-picker"), { ssr: false, loading: () => <div className="zone-map-loading">Loading OpenStreetMap…</div> });
type Committee = { id: string; name: string };
type Zone = { id: string; name: string; latitude: number; longitude: number; radiusMeters: number; committeeId: string | null; committee: { name: string } | null };
const defaultPoint = { latitude: 30.0444, longitude: 31.2357 };

export function AdminZoneManager({ initialZones, committees }: { initialZones: Zone[]; committees: Committee[] }) {
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
      if (!response.ok) throw new Error(result.error ?? "Could not save this zone.");
      setZones((current) => editingId
        ? current.map((zone) => zone.id === editingId ? result.zone : zone)
        : [...current, result.zone]);
      clearForm();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this zone.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(zone: Zone) {
    if (!window.confirm(`Delete the "${zone.name}" zone?`)) return;
    const response = await fetch(`/api/admin/zones/${zone.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) setMessage(result.error ?? "Could not delete the zone.");
    else setZones((current) => current.filter((entry) => entry.id !== zone.id));
  }

  return (
    <div className="admin-events">
      <form className="team-edit-form" onSubmit={save}>
        <h2>{editingId ? "Edit allowed zone" : "Create an allowed zone"}</h2>
        <p className="empty-note">Click the map to set the center, then choose the allowed radius. Map tiles © OpenStreetMap contributors.</p>
        <ZoneMapPicker {...point} radiusMeters={radiusMeters} onPick={setPoint} />
        <div className="admin-form-grid">
          <label>Zone name<input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={100} /></label>
          <label>Committee (optional)<select value={committeeId} onChange={(event) => setCommitteeId(event.target.value)}><option value="">All committees</option>{committees.map((committee) => <option value={committee.id} key={committee.id}>{committee.name}</option>)}</select></label>
          <label>Latitude<input type="number" step="any" min={-90} max={90} value={point.latitude} onChange={(event) => setPoint({ ...point, latitude: Number(event.target.value) })} required /></label>
          <label>Longitude<input type="number" step="any" min={-180} max={180} value={point.longitude} onChange={(event) => setPoint({ ...point, longitude: Number(event.target.value) })} required /></label>
          <label>Radius (meters)<input type="number" min={5} max={5000} value={radiusMeters} onChange={(event) => setRadiusMeters(Number(event.target.value))} required /></label>
        </div>
        {message && <p className="form-error" role="alert">{message}</p>}
        <div className="form-actions"><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : editingId ? "Save zone" : "Create zone"}</button>{editingId && <button type="button" className="button button-secondary" onClick={clearForm}>Cancel</button>}</div>
      </form>
      <section className="team-edit-form">
        <h2>Saved zones</h2>
        <div className="user-admin-list">{zones.map((zone) => <article className="user-admin-row" key={zone.id}>
          <div className="user-admin-identity"><strong>{zone.name}</strong><span>{zone.latitude.toFixed(5)}, {zone.longitude.toFixed(5)} · {zone.radiusMeters} m</span></div>
          <div className="user-admin-status"><span>{zone.committee?.name ?? "All committees"}</span></div>
          <div className="user-admin-actions"><button type="button" className="button button-secondary" onClick={() => editZone(zone)}>Edit</button><button type="button" className="button button-secondary danger-button" onClick={() => void remove(zone)}>Delete</button></div>
        </article>)}
          {!zones.length && <p className="empty-note">No reusable zones are configured yet.</p>}
        </div>
      </section>
    </div>
  );
}
