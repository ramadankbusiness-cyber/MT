"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";

export function ProfileForm({ initialName, email, initialPhone, initialPhoto }: { initialName: string; email: string; initialPhone: string | null; initialPhoto: string | null }) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [photoUrl, setPhotoUrl] = useState(initialPhoto);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone: phone || null }),
    });
    const result = await response.json();
    setMessage(response.ok ? "Profile saved." : result.error ?? "Could not save your profile.");
    setBusy(false);
  }

  async function uploadPhoto(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    const data = new FormData();
    data.set("photo", file);
    const response = await fetch("/api/profile/photo", { method: "POST", body: data });
    const result = await response.json();
    if (response.ok) {
      setPhotoUrl(result.photoUrl);
      setMessage("Profile photo updated.");
    } else {
      setMessage(result.error ?? "Could not upload your photo.");
    }
    setBusy(false);
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const result = await response.json();
    setMessage(response.ok ? "Password changed." : result.error ?? "Could not change your password.");
    if (response.ok) {
      setCurrentPassword("");
      setNewPassword("");
    }
    setBusy(false);
  }

  return (
    <div className="profile-layout">
      <form className="team-edit-form profile-form" onSubmit={saveProfile}>
        <h2>Profile details</h2>
        <div className="profile-photo-row"><div className="profile-photo">{photoUrl ? <Image src={photoUrl} alt="Your profile" fill sizes="88px" unoptimized /> : <span>{name.slice(0, 1).toUpperCase()}</span>}</div><label>Profile photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => void uploadPhoto(event.target.files?.[0])} /><small>JPG, PNG or WebP, up to 5 MB. Images are cropped square.</small></label></div>
        <label>Full name<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={100} required /></label>
        <label>Email address<input value={email} readOnly /></label>
        <label>Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} /></label>
        <button className="button button-primary" type="submit" disabled={busy}>Save profile</button>
      </form>
      <form className="team-edit-form profile-form" onSubmit={changePassword}>
        <h2>Change password</h2>
        <label>Current password<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
        <label>New password<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={12} required /><small>At least 12 characters with uppercase, lowercase, and a number.</small></label>
        <button className="button button-primary" type="submit" disabled={busy}>Update password</button>
      </form>
      {message && <p className="form-message profile-message" role="status">{message}</p>}
    </div>
  );
}
