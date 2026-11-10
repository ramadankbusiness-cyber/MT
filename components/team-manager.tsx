"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useAppToast } from "@/components/app-toast-provider";
import { useLocale, useTranslations } from "next-intl";
import { getCommitteeLabel } from "@/data/committees";

type Committee = { id: string; name: string };
export type ManagedTeamMember = {
  id: string;
  name: string;
  title: string;
  titleAr?: string | null;
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

const blank = { name: "", title: "", titleAr: "", committeeId: "", bio: "", bioAr: "", website: "", linkedin: "", instagram: "", photoUrl: "", visible: true };

export function TeamManager({ initialMembers, committees }: { initialMembers: ManagedTeamMember[]; committees: Committee[] }) {
  const showToast = useAppToast();
  const t = useTranslations("site.pages.teamManager");
  const locale = useLocale() as "en" | "ar";
  const [members, setMembers] = useState(initialMembers);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [formLanguage, setFormLanguage] = useState<"en" | "ar">("en");

  function startEdit(member: ManagedTeamMember) {
    setEditingId(member.id);
    setForm({
      name: member.name, title: member.title, titleAr: member.titleAr ?? "", committeeId: member.committeeId, bio: member.bio ?? "", bioAr: member.bioAr ?? "",
      website: member.socialLinks?.website ?? "", linkedin: member.socialLinks?.linkedin ?? "",
      instagram: member.socialLinks?.instagram ?? "", photoUrl: member.photoUrl ?? "", visible: member.visible,
    });
    setPhoto(null);
    setFormLanguage("en");
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
        name: form.name, title: form.title, titleAr: form.titleAr || null, committeeId: form.committeeId, bio: form.bio || null, bioAr: form.bioAr || null,
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
      const errorMessage = t("saveError");
      setMessage(errorMessage);
      showToast(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  async function remove(member: ManagedTeamMember) {
    if (!window.confirm(t("removeConfirm", { name: member.name }))) return;
    const response = await fetch(`/api/team/${member.id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json();
      setMessage(result.error ?? t("removeError"));
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
      setMessage(t("orderError"));
    }
  }

  return (
    <section className="team-admin-panel">
      <div className="admin-section-heading">
        <div><p className="eyebrow">{t("controls")}</p><h2>{t("manage")}</h2></div>
        <button className="button button-primary" type="button" onClick={() => { resetForm(); setMessage(""); }}>{t("add")}</button>
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
            <span className="drag-handle" aria-label={t("drag")} title={t("drag")}>⠿</span>
            <div className="team-admin-avatar">
              {member.photoUrl ? <Image src={member.photoUrl} alt="" fill sizes="48px" /> : <span>{member.name.slice(0, 1).toUpperCase()}</span>}
            </div>
            <div className="team-admin-name"><strong>{member.name}</strong><span>{member.title} · {getCommitteeLabel(member.committee.name, locale)}</span></div>
            <span className={`visibility-tag${member.visible ? "" : " is-hidden"}`}>{member.visible ? t("visible") : t("hidden")}</span>
            <button type="button" className="button button-secondary order-button" aria-label={t("moveUp", { name: member.name })} disabled={members[0]?.id === member.id} onClick={() => void changeOrder(member.id, members[members.findIndex((entry) => entry.id === member.id) - 1]?.id ?? member.id)}>↑</button>
            <button type="button" className="button button-secondary order-button" aria-label={t("moveDown", { name: member.name })} disabled={members[members.length - 1]?.id === member.id} onClick={() => void changeOrder(member.id, members[members.findIndex((entry) => entry.id === member.id) + 1]?.id ?? member.id)}>↓</button>
            <button type="button" className="button button-secondary" onClick={() => startEdit(member)}>{t("editButton")}</button>
            <button type="button" className="button button-secondary danger-button" onClick={() => void remove(member)}>{t("remove")}</button>
          </div>
        ))}
        {!members.length && <p className="empty-note">{t("empty")}</p>}
      </div>

      <form className="team-edit-form" onSubmit={save}>
        <h3>{editingId ? t("edit") : t("addTitle")}</h3>
        <div className="language-tabs" role="tablist" aria-label="Team member language">
          <button type="button" role="tab" aria-selected={formLanguage === "en"} onClick={() => setFormLanguage("en")}>{t("english")}</button>
          <button type="button" role="tab" aria-selected={formLanguage === "ar"} onClick={() => setFormLanguage("ar")}>{t("arabic")}</button>
        </div>
        <div className="admin-form-grid">
          <label>{t("name")}<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={100} /></label>
          {formLanguage === "en"
            ? <label>{t("titleEn")}<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={t("titlePlaceholder")} required maxLength={100} /></label>
            : <label lang="ar">{t("titleAr")}<input value={form.titleAr} onChange={(event) => setForm({ ...form, titleAr: event.target.value })} dir="rtl" maxLength={100} /></label>}
          <label>{t("committee")}<select value={form.committeeId} onChange={(event) => setForm({ ...form, committeeId: event.target.value })} required><option value="">{t("chooseCommittee")}</option>{committees.map((committee) => <option key={committee.id} value={committee.id}>{getCommitteeLabel(committee.name, locale)}</option>)}</select></label>
          <label>{t("photo")}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} /></label>
          {formLanguage === "en"
            ? <label className="admin-form-wide">{t("bioEn")}<textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} maxLength={500} rows={3} /></label>
            : <label className="admin-form-wide" lang="ar">{t("bioAr")}<textarea value={form.bioAr} onChange={(event) => setForm({ ...form, bioAr: event.target.value })} dir="rtl" maxLength={500} rows={3} /></label>}
          <label>{t("website")}<input type="url" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></label>
          <label>{t("linkedin")}<input type="url" value={form.linkedin} onChange={(event) => setForm({ ...form, linkedin: event.target.value })} /></label>
          <label>{t("instagram")}<input type="url" value={form.instagram} onChange={(event) => setForm({ ...form, instagram: event.target.value })} /></label>
          <label className="visibility-control"><input type="checkbox" checked={form.visible} onChange={(event) => setForm({ ...form, visible: event.target.checked })} />{t("show")}</label>
        </div>
        {message && <p className="form-error" role="alert">{message}</p>}
        <div className="form-actions"><button className="button button-primary" type="submit" disabled={busy}>{busy ? t("saving") : t("save")}</button>{editingId && <button className="button button-secondary" type="button" onClick={resetForm}>{t("cancel")}</button>}</div>
      </form>
    </section>
  );
}
