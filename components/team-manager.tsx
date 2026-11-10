"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useAppToast } from "@/components/app-toast-provider";

type Committee = { id: string; name: string };
export type ManagedTeamMember = {
  id: string;
  name: string;
  title: string;
  titleAr?: string;
  committeeId: string;
  committee: { name: string };
  bio: string | null;
  bioAr?: string | null;
  socialLinks: { website?: string; linkedin?: string; instagram?: string } | null;
  photoUrl: string | null;
  order: number;
  visible: boolean;
  userId: string | null;
};

const blank = { name: "", title: "", committeeId: "", bio: "", website: "", linkedin: "", instagram: "", photoUrl: "", visible: true };

export function TeamManager({ initialMembers, committees }: { initialMembers: ManagedTeamMember[]; committees: Committee[] }) {
  const showToast = useAppToast();
  const [members, setMembers] = useState(initialMembers);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  function startEdit(member: ManagedTeamMember) {
    setEditingId(member.id);
    setForm({
      name: member.name, title: member.title, committeeId: member.committeeId, bio: member.bio ?? "",
      website: member.socialLinks?.website ?? "", linkedin: member.socialLinks?.linkedin ?? "",
      instagram: member.socialLinks?.instagram ?? "", photoUrl: member.photoUrl ?? "", visible: member.visible,
    });
    setPhoto(null);
    setMessage("");
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...blank, committeeId: committees[0]?.id ?? "" });
    setPhoto(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      let photoUrl = form.photoUrl;
      if (photo) {
        const upload = new FormData();
        upload.set("photo", photo);
        const response = await fetch("/api/team/upload", { method: "POST", body: upload });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Photo upload failed.");
        photoUrl = result.url;
      }
      const payload = {
        name: form.name, title: form.title, committeeId: form.committeeId, bio: form.bio || null,
        socialLinks: { website: form.website, linkedin: form.linkedin, instagram: form.instagram },
        photoUrl: photoUrl || null, visible: form.visible,
      };
      const response = await fetch(editingId ? `/api/team/${editingId}` : "/api/team", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save this team member.");
      setMembers((current) => editingId
        ? current.map((member) => member.id === editingId ? result.member : member).sort((a, b) => a.order - b.order)
        : [...current, result.member].sort((a, b) => a.order - b.order));
      resetForm();
    } catch {
      const errorMessage = "Could not save this team member. Please try again.";
      setMessage(errorMessage);
      showToast(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  async function remove(member: ManagedTeamMember) {
    if (!window.confirm(`Remove ${member.name} from the team page?`)) return;
    const response = await fetch(`/api/team/${member.id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json();
      setMessage(result.error ?? "Could not remove this person.");
      return;
    }
    setMembers((current) => current.filter((entry) => entry.id !== member.id));
  }

  async function changeOrder(fromId: string, toId: string) {
    if (fromId === toId) return;
    const next = [...members];
    const from = next.findIndex((entry) => entry.id === fromId);
    const to = next.findIndex((entry) => entry.id === toId);
    if (from < 0 || to < 0) return;
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setMembers(next);
    const response = await fetch("/api/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((entry) => entry.id) }),
    });
    if (!response.ok) {
      setMembers(members);
      setMessage("Could not save the new team order.");
    }
  }

  return (
    <section className="team-admin-panel">
      <div className="admin-section-heading">
        <div><p className="eyebrow">ADMIN CONTROLS</p><h2>Manage the team</h2></div>
        <button className="button button-primary" type="button" onClick={() => { resetForm(); setMessage(""); }}>Add person</button>
      </div>
      <div className="team-admin-list">
        {members.map((member) => (
          <div
            className={`team-admin-row${draggedId === member.id ? " is-dragged" : ""}`}
            key={member.id}
            draggable
            onDragStart={() => setDraggedId(member.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => { if (draggedId) void changeOrder(draggedId, member.id); setDraggedId(null); }}
            onDragEnd={() => setDraggedId(null)}
          >
            <span className="drag-handle" aria-label="Drag to reorder" title="Drag to reorder">⠿</span>
            <div className="team-admin-avatar">
              {member.photoUrl ? <Image src={member.photoUrl} alt="" fill sizes="48px" /> : <span>{member.name.slice(0, 1).toUpperCase()}</span>}
            </div>
            <div className="team-admin-name"><strong>{member.name}</strong><span>{member.title} · {member.committee.name}</span></div>
            <span className={`visibility-tag${member.visible ? "" : " is-hidden"}`}>{member.visible ? "Visible" : "Hidden"}</span>
            <button type="button" className="button button-secondary order-button" aria-label={`Move ${member.name} up`} disabled={members[0]?.id === member.id} onClick={() => void changeOrder(member.id, members[members.findIndex((entry) => entry.id === member.id) - 1]?.id ?? member.id)}>↑</button>
            <button type="button" className="button button-secondary order-button" aria-label={`Move ${member.name} down`} disabled={members[members.length - 1]?.id === member.id} onClick={() => void changeOrder(member.id, members[members.findIndex((entry) => entry.id === member.id) + 1]?.id ?? member.id)}>↓</button>
            <button type="button" className="button button-secondary" onClick={() => startEdit(member)}>Edit</button>
            <button type="button" className="button button-secondary danger-button" onClick={() => void remove(member)}>Remove</button>
          </div>
        ))}
        {!members.length && <p className="empty-note">No people added yet. Create the first public team entry above.</p>}
      </div>

      <form className="team-edit-form" onSubmit={save}>
        <h3>{editingId ? "Edit team member" : "Add a team member"}</h3>
        <div className="admin-form-grid">
          <label>Full name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={100} /></label>
          <label>Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. HEAD MTC" required maxLength={100} /></label>
          <label>Committee<select value={form.committeeId} onChange={(event) => setForm({ ...form, committeeId: event.target.value })} required><option value="">Choose committee</option>{committees.map((committee) => <option key={committee.id} value={committee.id}>{committee.name}</option>)}</select></label>
          <label>Photo (JPG, PNG or WebP; up to 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} /></label>
          <label className="admin-form-wide">Short bio<textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} maxLength={500} rows={3} /></label>
          <label>Website<input type="url" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></label>
          <label>LinkedIn<input type="url" value={form.linkedin} onChange={(event) => setForm({ ...form, linkedin: event.target.value })} /></label>
          <label>Instagram<input type="url" value={form.instagram} onChange={(event) => setForm({ ...form, instagram: event.target.value })} /></label>
          <label className="visibility-control"><input type="checkbox" checked={form.visible} onChange={(event) => setForm({ ...form, visible: event.target.checked })} />Show this person on the public page</label>
        </div>
        {message && <p className="form-error" role="alert">{message}</p>}
        <div className="form-actions"><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save person"}</button>{editingId && <button className="button button-secondary" type="button" onClick={resetForm}>Cancel</button>}</div>
      </form>
    </section>
  );
}
