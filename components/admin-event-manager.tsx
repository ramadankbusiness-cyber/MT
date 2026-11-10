"use client";

import { FormEvent, useState } from "react";
import { useAppToast } from "@/components/app-toast-provider";

type Committee = { id: string; name: string };
export type ManagedEvent = {
  id: string;
  title: string;
  description: string;
  startsAt: string | Date;
  endsAt: string | Date | null;
  location: string | null;
  committeeId: string | null;
  committee: { id: string; name: string } | null;
  published: boolean;
};

const emptyForm = { title: "", description: "", startsAt: "", endsAt: "", location: "", committeeId: "", published: true };
const localInput = (date: string | Date | null) => date ? new Date(date).toISOString().slice(0, 16) : "";

export function AdminEventManager({ initialEvents, committees, isAdmin }: { initialEvents: ManagedEvent[]; committees: Committee[]; isAdmin: boolean }) {
  const showToast = useAppToast();
  const [events, setEvents] = useState(initialEvents);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function editEvent(event: ManagedEvent) {
    setEditingId(event.id);
    setForm({
      title: event.title, description: event.description, startsAt: localInput(event.startsAt),
      endsAt: localInput(event.endsAt), location: event.location ?? "", committeeId: event.committeeId ?? "",
      published: event.published,
    });
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
      };
      const response = await fetch(editingId ? `/api/events/${editingId}` : "/api/events", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save this event.");
      setEvents((current) => editingId
        ? current.map((item) => item.id === editingId ? result.event : item).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
        : [...current, result.event].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()));
      setForm(emptyForm);
      setEditingId(null);
    } catch {
      const errorMessage = "Could not save this event. Please try again.";
      setMessage(errorMessage);
      showToast(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  async function remove(event: ManagedEvent) {
    if (!window.confirm(`Delete "${event.title}"?`)) return;
    const response = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) setMessage(result.error ?? "Could not delete the event.");
    else setEvents((current) => current.filter((entry) => entry.id !== event.id));
  }

  return (
    <div className="admin-events">
      <form className="team-edit-form" onSubmit={save}>
        <h2>{editingId ? "Edit event" : "Create an event"}</h2>
        <div className="admin-form-grid">
          <label>Event title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required maxLength={120} /></label>
          <label>Starts at<input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} required /></label>
          <label>Ends at (optional)<input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></label>
          <label>Location<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} maxLength={250} /></label>
          {isAdmin && <label>Committee<select value={form.committeeId} onChange={(event) => setForm({ ...form, committeeId: event.target.value })}><option value="">All members</option>{committees.map((committee) => <option value={committee.id} key={committee.id}>{committee.name}</option>)}</select></label>}
          <label className="admin-form-wide">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required maxLength={2000} rows={4} /></label>
          <label className="visibility-control"><input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} />Publish this event</label>
        </div>
        {message && <p className="form-error" role="alert">{message}</p>}
        <div className="form-actions"><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Saving…" : editingId ? "Save changes" : "Create event"}</button>{editingId && <button className="button button-secondary" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button>}</div>
      </form>
      <section className="team-edit-form">
        <h2>Events</h2>
        <div className="user-admin-list">{events.map((item) => <article className="user-admin-row" key={item.id}>
          <div className="user-admin-identity"><strong>{item.title}</strong><span>{new Date(item.startsAt).toLocaleString()} · {item.location || "No location"}</span></div>
          <div className="user-admin-status"><span>{item.committee?.name ?? "All members"}</span><span>{item.published ? "Published" : "Draft"}</span></div>
          <div className="user-admin-actions"><button className="button button-secondary" type="button" onClick={() => editEvent(item)}>Edit</button>{isAdmin && <button className="button button-secondary danger-button" type="button" onClick={() => void remove(item)}>Delete</button>}</div>
        </article>)}
          {!events.length && <p className="empty-note">No events have been added yet.</p>}
        </div>
      </section>
    </div>
  );
}
