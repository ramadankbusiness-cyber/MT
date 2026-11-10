"use client";

import { FormEvent, useState } from "react";

type Session = { id: string; title: string; startsAt: string };
type Excuse = {
  id: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  reviewNote: string | null;
  user?: { name: string; committee?: { name: string } | null };
  session: { id: string; title: string; startsAt: string };
};

export function ExcuseManager({ role, sessions, initialExcuses }: { role: "ADMIN" | "LEADER" | "MEMBER"; sessions: Session[]; initialExcuses: Excuse[] }) {
  const [excuses, setExcuses] = useState(initialExcuses);
  const [sessionId, setSessionId] = useState("");
  const [reason, setReason] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [message, setMessage] = useState("");
  const [pendingId, setPendingId] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/excuses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, reason }),
    });
    const result = await response.json();
    if (!response.ok) setMessage(result.error ?? "Could not submit the request.");
    else {
      setExcuses((current) => [result.excuse, ...current]);
      setReason("");
      setMessage("Excuse request submitted for review.");
    }
  }

  async function review(item: Excuse, status: "APPROVED" | "REJECTED") {
    setPendingId(item.id);
    const response = await fetch(`/api/excuses/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewNote }),
    });
    const result = await response.json();
    if (!response.ok) setMessage(result.error ?? "Could not review the request.");
    else {
      setExcuses((current) => current.map((entry) => entry.id === item.id ? result.excuse : entry));
      setReviewNote("");
      setMessage(`Request ${status.toLowerCase()}.`);
    }
    setPendingId("");
  }

  return (
    <div className="excuse-manager">
      {role === "MEMBER" && <form className="team-edit-form" onSubmit={submit}>
        <h2>Request an excuse</h2>
        <label>Attendance session<select value={sessionId} onChange={(event) => setSessionId(event.target.value)} required><option value="">Choose a session</option>{sessions.map((session) => <option value={session.id} key={session.id}>{session.title} · {new Date(session.startsAt).toLocaleDateString()}</option>)}</select></label>
        <label>Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={1000} rows={4} required /></label>
        {message && <p className="form-message" role="status">{message}</p>}
        <button className="button button-primary">Submit request</button>
      </form>}
      {(role === "ADMIN" || role === "LEADER") && <section className="team-edit-form">
        <h2>Review requests</h2>
        <label>Review note (optional)<input value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} maxLength={500} /></label>
      </section>}
      {message && role !== "MEMBER" && <p className="form-message" role="status">{message}</p>}
      <div className="excuse-list">{excuses.map((item) => <article className="excuse-card" key={item.id}>
        <div><p className="eyebrow">{item.status} · {new Date(item.createdAt).toLocaleDateString()}</p><h2>{item.session.title}</h2>{item.user && <p className="excuse-author">{item.user.name}{item.user.committee ? ` · ${item.user.committee.name}` : ""}</p>}<p>{item.reason}</p>{item.reviewNote && <p className="excuse-review-note">Review note: {item.reviewNote}</p>}</div>
        {(role === "ADMIN" || role === "LEADER") && item.status === "PENDING" && <div className="form-actions"><button type="button" className="button button-primary" disabled={pendingId === item.id} onClick={() => void review(item, "APPROVED")}>Approve</button><button type="button" className="button button-secondary" disabled={pendingId === item.id} onClick={() => void review(item, "REJECTED")}>Reject</button></div>}
      </article>)}
        {!excuses.length && <p className="empty-note">No excuse requests yet.</p>}
      </div>
    </div>
  );
}
