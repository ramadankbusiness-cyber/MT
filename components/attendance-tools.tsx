"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAppToast } from "@/components/app-toast-provider";

type Role = "ADMIN" | "LEADER" | "MEMBER";
type Zone = { id: string; name: string };
type Committee = { id: string; name: string };
type AttendanceMember = { id: string; name: string; committeeId: string | null; committee: { name: string } | null };
export type AttendanceSessionView = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  lateAfterMinutes: number;
  qrMode: "ROTATING" | "STATIC";
  committee: Committee | null;
  zone: { id: string; name: string; latitude: number; longitude: number; radiusMeters: number };
  recordCount: number;
};
type AttendanceRecordView = { id: string; status: string; checkedInAt: string | null; session: { title: string } };

export function AttendanceTools({
  role,
  initialSessions,
  zones,
  committees,
  members,
  records,
  attendanceRate,
}: {
  role: Role;
  initialSessions: AttendanceSessionView[];
  zones: Zone[];
  committees: Committee[];
  members: AttendanceMember[];
  records: AttendanceRecordView[];
  attendanceRate: number;
}) {
  if (role === "MEMBER") return <MemberAttendance records={records} attendanceRate={attendanceRate} />;
  return <SessionManager sessions={initialSessions} zones={zones} committees={committees} members={members} isAdmin={role === "ADMIN"} />;
}

function SessionManager({ sessions: initialSessions, zones, committees, members, isAdmin }: { sessions: AttendanceSessionView[]; zones: Zone[]; committees: Committee[]; members: AttendanceMember[]; isAdmin: boolean }) {
  const showToast = useAppToast();
  const [sessions, setSessions] = useState(initialSessions);
  const [title, setTitle] = useState("");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [committeeId, setCommitteeId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [lateAfterMinutes, setLateAfterMinutes] = useState(10);
  const [qrMode, setQrMode] = useState<"ROTATING" | "STATIC">("ROTATING");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function createSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/attendance/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, zoneId, committeeId: committeeId || null,
          startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(),
          lateAfterMinutes, qrMode,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not create the session.");
      const added: AttendanceSessionView = {
        ...result.session,
        startsAt: result.session.startsAt,
        endsAt: result.session.endsAt,
        recordCount: 0,
      };
      setSessions((current) => [added, ...current]);
      setTitle("");
      setStartsAt("");
      setEndsAt("");
      setMessage("Attendance session created.");
    } catch {
      const errorMessage = "Could not create the session. Please try again.";
      setMessage(errorMessage);
      showToast(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="attendance-layout">
      {isAdmin && <form className="team-edit-form" onSubmit={createSession}>
        <h2>Create attendance session</h2>
        <div className="admin-form-grid">
          <label>Session title<input value={title} onChange={(event) => setTitle(event.target.value)} minLength={2} maxLength={120} required /></label>
          <label>Allowed zone<select value={zoneId} onChange={(event) => setZoneId(event.target.value)} required><option value="">Choose a zone</option>{zones.map((zone) => <option value={zone.id} key={zone.id}>{zone.name}</option>)}</select></label>
          <label>Committee<select value={committeeId} onChange={(event) => setCommitteeId(event.target.value)}><option value="">All committees</option>{committees.map((committee) => <option value={committee.id} key={committee.id}>{committee.name}</option>)}</select></label>
          <label>Starts at<input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required /></label>
          <label>Ends at<input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} required /></label>
          <label>Late after (minutes)<input type="number" min={0} max={240} value={lateAfterMinutes} onChange={(event) => setLateAfterMinutes(Number(event.target.value))} required /></label>
          <label>QR mode<select value={qrMode} onChange={(event) => setQrMode(event.target.value === "STATIC" ? "STATIC" : "ROTATING")}><option value="ROTATING">Rotating (recommended)</option><option value="STATIC">Static (printable)</option></select></label>
        </div>
        {qrMode === "STATIC" && <p className="warning-note">Static QR codes can be copied or shared. Use only when rotating codes are not practical.</p>}
        {message && <p className="form-message" role="status">{message}</p>}
        <button className="button button-primary" disabled={busy || !zones.length}>{busy ? "Creating…" : "Create session"}</button>
        {!zones.length && <p className="empty-note">Create an allowed area before making an attendance session.</p>}
      </form>}
      <section className="team-edit-form attendance-session-list">
        <h2>{isAdmin ? "Attendance sessions" : "Committee sessions"}</h2>
        {sessions.map((session) => <article className="attendance-session-card" key={session.id}>
          <div className="attendance-session-copy">
            <p className="eyebrow">{session.committee?.name ?? "ALL COMMITTEES"} · {session.zone.name}</p>
            <h3>{session.title}</h3>
            <p>{new Date(session.startsAt).toLocaleString()} – {new Date(session.endsAt).toLocaleString()}</p>
            <span>{session.recordCount} check-ins · Late after {session.lateAfterMinutes} min</span>
            <div className="attendance-session-actions"><LiveCheckIns sessionId={session.id} /><a href="/api/admin/attendance/export">Export CSV</a></div>
          </div>
          <div className="attendance-session-tools">
            {isAdmin && <AttendanceQr session={session} />}
            {isAdmin && <ManualAttendance session={session} members={members} />}
          </div>
        </article>)}
        {!sessions.length && <p className="empty-note">No attendance sessions have been scheduled.</p>}
      </section>
    </div>
  );
}

function ManualAttendance({ session, members }: { session: AttendanceSessionView; members: AttendanceMember[] }) {
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState("ABSENT");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const eligibleMembers = members.filter((member) => !session.committee || member.committeeId === session.committee.id);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch(`/api/admin/attendance/sessions/${session.id}/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, status, reason }),
    });
    const result = await response.json();
    setMessage(response.ok ? "Attendance status updated." : result.error ?? "Could not update attendance.");
  }

  return <div className="manual-attendance">
    <button type="button" className="button button-secondary" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? "Hide manual mark" : "Mark attendance"}</button>
    {open && <form onSubmit={submit}>
      <label>Member<select value={userId} onChange={(event) => setUserId(event.target.value)} required><option value="">Choose a member</option>{eligibleMembers.map((member) => <option value={member.id} key={member.id}>{member.name} · {member.committee?.name ?? "No committee"}</option>)}</select></label>
      <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="ABSENT">Absent</option><option value="PRESENT">Present</option><option value="LATE">Late</option><option value="EXCUSED">Excused</option></select></label>
      <label>Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={500} required rows={2} /></label>
      {message && <p className="form-message" role="status">{message}</p>}
      <button type="submit" className="button button-primary">Save attendance</button>
    </form>}
  </div>;
}

function LiveCheckIns({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<{ id: string; status: string; checkedInAt: string | null; user: { name: string; committee: { name: string } | null } }[]>([]);
  const [attempts, setAttempts] = useState<{ id: string; reason: string; status: string; user: { name: string; committee: { name: string } | null } | null; createdAt: string }[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    const refresh = async () => {
      const response = await fetch(`/api/admin/attendance/sessions/${sessionId}`, { cache: "no-store" });
      if (!response.ok) {
        const result = await response.json();
        if (active) setError(result.error ?? "Could not load check-ins.");
        return;
      }
      const result = await response.json();
      if (!active) return;
      setRecords(result.records);
      setAttempts(result.attempts);
      setError("");
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [open, sessionId]);

  return (
    <div className="live-checkins">
      <button type="button" className="button button-secondary" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? "Hide live check-ins" : "Live check-ins"}</button>
      {open && <div className="live-checkins-details">
        {error && <p className="form-error" role="alert">{error}</p>}
        <strong>{records.length} check-ins · refreshes every 15 seconds</strong>
        <ul>{records.map((record) => <li key={record.id}><span>{record.user.name}</span><span>{record.status.toLowerCase()}</span></li>)}</ul>
        {attempts.length > 0 && <details><summary>Recent failed or suspicious attempts ({attempts.length})</summary><ul>{attempts.map((attempt) => <li key={attempt.id}><span>{attempt.user?.name ?? "Unknown member"} · {attempt.status.toLowerCase()}</span><span>{attempt.reason}</span></li>)}</ul></details>}
      </div>}
    </div>
  );
}

function AttendanceQr({ session }: { session: AttendanceSessionView }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/attendance/sessions/${session.id}/qr`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "QR code is not available yet.");
      setToken(result.token);
      setExpiresAt(result.expiresAt);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load a QR code.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { if (session.qrMode === "ROTATING") void refresh(); }, 20_000);
    return () => window.clearInterval(timer);
  }, [session.id, session.qrMode]);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await panelRef.current?.requestFullscreen();
    } catch {
      setError("Fullscreen mode is not available in this browser.");
    }
  }

  return (
    <div className="attendance-qr-panel" ref={panelRef}>
      {token ? <QRCodeSVG value={token} size={180} level="M" includeMargin aria-label={`Attendance QR for ${session.title}`} /> : <div className="qr-placeholder">{busy ? "Loading QR…" : "QR unavailable"}</div>}
      {session.qrMode === "STATIC" && <strong className="warning-note">Static QR: it can be shared or reused until the session ends.</strong>}
      {expiresAt && session.qrMode === "ROTATING" && <small>Refreshes automatically · valid until {new Date(expiresAt).toLocaleTimeString()}</small>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="button button-secondary" onClick={() => void refresh()}>Refresh</button><button type="button" className="button button-secondary" onClick={() => void toggleFullscreen()}>Full screen</button></div>
    </div>
  );
}

function MemberAttendance({ records, attendanceRate }: { records: AttendanceRecordView[]; attendanceRate: number }) {
  const showToast = useAppToast();
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);

  async function submitCheckIn(token: string) {
    setBusy(true);
    setScanning(false);
    setMessage("Getting your precise location…");
    const scanner = scannerRef.current;
    if (scanner) {
      await scanner.stop().catch(() => undefined);
      scanner.clear();
      scannerRef.current = null;
    }
    if (!("geolocation" in navigator)) {
      setMessage("Location is unavailable. Enable location services on your device and try again.");
      setBusy(false);
      return;
    }
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 });
      });
      let deviceId = localStorage.getItem("mt-attendance-device");
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem("mt-attendance-device", deviceId);
      }
      const response = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, latitude: position.coords.latitude, longitude: position.coords.longitude,
          accuracy: position.coords.accuracy, timestamp: position.timestamp, deviceId,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Check-in was not accepted.");
      setSuccess(true);
      setMessage(`Attendance confirmed: ${result.record.status.toLowerCase()}.`);
    } catch (error) {
      const geolocationError = error as GeolocationPositionError;
      if (typeof geolocationError.code === "number") {
        const errorMessage = geolocationError.code === geolocationError.PERMISSION_DENIED
          ? "Location access was denied. Allow location for this site in your browser settings, then scan again."
          : "Could not get a precise location. Enable device location services and try again.";
        setMessage(errorMessage);
        showToast(errorMessage);
      } else {
        const errorMessage = "Could not check in. Please try again.";
        setMessage(errorMessage);
        showToast(errorMessage);
      }
    } finally {
      setBusy(false);
    }
  }

  async function startScanner() {
    setMessage("");
    setSuccess(false);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("attendance-qr-reader");
      scannerRef.current = scanner;
      setScanning(true);
      await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 240 } }, (value) => {
        void submitCheckIn(value);
      }, () => undefined);
    } catch {
      setScanning(false);
      scannerRef.current = null;
      setMessage("Camera access failed. Allow camera access for this site in your browser settings, then reload and try again.");
    }
  }

  useEffect(() => () => {
    const scanner = scannerRef.current;
    if (scanner?.isScanning) void scanner.stop().then(() => scanner.clear()).catch(() => undefined);
  }, []);

  return (
    <div className="member-attendance">
      <section className="team-edit-form check-in-panel">
        <div className="attendance-rate"><strong>{attendanceRate}%</strong><span>Your attendance</span></div>
        <h2>Scan attendance</h2>
        <p>Scan the QR code shown at the event, then allow precise location access to confirm your check-in.</p>
        <div id="attendance-qr-reader" className="attendance-qr-reader" />
        {!scanning && <button className="button button-primary" type="button" onClick={() => void startScanner()} disabled={busy}>{busy ? "Checking in…" : "Open camera and scan"}</button>}
        {message && <p className={success ? "form-message" : "form-error"} role="status">{message}</p>}
        <p className="empty-note">If the camera or location is blocked, open your browser’s site settings, allow access, then try again.</p>
      </section>
      <section className="team-edit-form">
        <h2>My attendance history</h2>
        <div className="user-admin-list">{records.map((record) => <article className="user-admin-row" key={record.id}>
          <div className="user-admin-identity"><strong>{record.session.title}</strong><span>{record.checkedInAt ? new Date(record.checkedInAt).toLocaleString() : "No check-in time"}</span></div>
          <div className="user-admin-status"><span>{record.status.toLowerCase()}</span></div>
        </article>)}
          {!records.length && <p className="empty-note">Your attendance records will appear here after you check in.</p>}
        </div>
      </section>
    </div>
  );
}
