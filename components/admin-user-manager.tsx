"use client";

import { FormEvent, useState } from "react";
import { useAppToast } from "@/components/app-toast-provider";

type Role = "ADMIN" | "LEADER" | "MEMBER";
type Committee = { id: string; name: string };
export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  committeeId: string | null;
  committee: { name: string } | null;
  isActive: boolean;
  mustChangePassword: boolean;
};

const initialForm = { name: "", email: "", role: "MEMBER" as Role, committeeId: "" };
const parseRole = (value: string): Role => value === "ADMIN" || value === "LEADER" || value === "MEMBER" ? value : "MEMBER";

export function AdminUserManager({ initialUsers, committees }: { initialUsers: AdminUserRow[]; committees: Committee[] }) {
  const showToast = useAppToast();
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setTemporaryPassword("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, committeeId: form.committeeId || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not create the account.");
      const committee = committees.find((entry) => entry.id === result.user.committeeId);
      setUsers((current) => [...current, { ...result.user, committee: committee ? { name: committee.name } : null, isActive: true, mustChangePassword: true }]);
      setTemporaryPassword(result.temporaryPassword);
      setMessage(`Account created for ${result.user.email}. Share this temporary password securely.`);
      setForm(initialForm);
    } catch {
      const errorMessage = "Could not create the account. Please try again.";
      setMessage(errorMessage);
      showToast(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  async function updateUser(id: string, changes: { isActive: boolean } | { role: Role; committeeId: string | null }) {
    setMessage("");
    const response = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "Could not update this account.");
      return;
    }
    setUsers((current) => current.map((user) => {
      if (user.id !== id) return user;
      if ("isActive" in changes) return { ...user, isActive: changes.isActive };
      return { ...user, ...changes, committee: committees.find((entry) => entry.id === changes.committeeId) ?? null, mustChangePassword: true };
    }));
    if ("role" in changes) setMessage("Role updated. The account must choose a new password at next sign-in.");
  }

  async function resetPassword(id: string) {
    const response = await fetch(`/api/admin/users/${id}`, { method: "POST" });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "Could not reset the password.");
      return;
    }
    setTemporaryPassword(result.temporaryPassword);
    setMessage("Password reset. Share this temporary password securely.");
    setUsers((current) => current.map((user) => user.id === id ? { ...user, mustChangePassword: true } : user));
  }

  async function removeUser(user: AdminUserRow) {
    if (!window.confirm(`Permanently delete the account for ${user.name}? This cannot be undone.`)) return;
    const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "Could not delete the account.");
      return;
    }
    setUsers((current) => current.filter((entry) => entry.id !== user.id));
  }

  return (
    <div className="admin-users">
      <form className="team-edit-form" onSubmit={createUser}>
        <h2>Create an account</h2>
        <div className="admin-form-grid">
          <label>Full name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={2} maxLength={100} /></label>
          <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required maxLength={254} /></label>
          <label>Role<select value={form.role} onChange={(event) => setForm({ ...form, role: parseRole(event.target.value) })}><option value="MEMBER">Member</option><option value="LEADER">Leader</option><option value="ADMIN">Admin</option></select></label>
          <label>Committee<select value={form.committeeId} onChange={(event) => setForm({ ...form, committeeId: event.target.value })} disabled={form.role === "ADMIN"} required={form.role !== "ADMIN"}><option value="">Choose committee</option>{committees.map((committee) => <option key={committee.id} value={committee.id}>{committee.name}</option>)}</select></label>
        </div>
        <p className="empty-note">A secure temporary password is generated automatically. New accounts must change it at first sign-in.</p>
        {message && <p className="form-message" role="status">{message}</p>}
        {temporaryPassword && <p className="temporary-password"><strong>Temporary password:</strong> <code>{temporaryPassword}</code></p>}
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
      </form>

      <section className="team-edit-form">
        <h2>Accounts</h2>
        <div className="user-admin-list">
          {users.map((user) => (
            <UserAdminRow
              key={user.id}
              user={user}
              committees={committees}
              onUpdate={(changes) => void updateUser(user.id, changes)}
              onReset={() => void resetPassword(user.id)}
              onRemove={() => void removeUser(user)}
            />
          ))}
          {!users.length && <p className="empty-note">No accounts have been created yet.</p>}
        </div>
      </section>
    </div>
  );
}

function UserAdminRow({
  user,
  committees,
  onUpdate,
  onReset,
  onRemove,
}: {
  user: AdminUserRow;
  committees: Committee[];
  onUpdate: (changes: { isActive: boolean } | { role: Role; committeeId: string | null }) => void;
  onReset: () => void;
  onRemove: () => void;
}) {
  const [role, setRole] = useState(user.role);
  const [committeeId, setCommitteeId] = useState(user.committeeId ?? "");
  return (
    <article className="user-admin-row">
      <div className="user-admin-identity"><strong>{user.name}</strong><span>{user.email}</span></div>
      <div className="user-admin-status"><span>{user.committee?.name ?? "No committee"}</span><span>{user.isActive ? "Active" : "Inactive"}{user.mustChangePassword ? " · Password change required" : ""}</span></div>
      <div className="user-role-controls">
        <label><span className="sr-only">Role for {user.name}</span><select value={role} onChange={(event) => setRole(parseRole(event.target.value))}><option value="ADMIN">Admin</option><option value="LEADER">Leader</option><option value="MEMBER">Member</option></select></label>
        <label><span className="sr-only">Committee for {user.name}</span><select value={committeeId} disabled={role === "ADMIN"} onChange={(event) => setCommitteeId(event.target.value)}><option value="">Choose committee</option>{committees.map((committee) => <option key={committee.id} value={committee.id}>{committee.name}</option>)}</select></label>
        <button type="button" className="button button-secondary" onClick={() => onUpdate({ role, committeeId: role === "ADMIN" ? null : committeeId || null })}>Save role</button>
      </div>
      <div className="user-admin-actions">
        <button type="button" className="button button-secondary" onClick={() => onUpdate({ isActive: !user.isActive })}>{user.isActive ? "Deactivate" : "Reactivate"}</button>
        <button type="button" className="button button-secondary" onClick={onReset}>Reset password</button>
        <button type="button" className="button button-secondary danger-button" onClick={onRemove}>Delete</button>
      </div>
    </article>
  );
}
