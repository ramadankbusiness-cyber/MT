"use client";

import { useEffect, useState } from "react";
import { CLUB_COMMITTEES } from "@/data/committees";

type Application = {
  id: number;
  name: string;
  email: string;
  committees: string[];
  message: string;
  created_at: string;
};

export function AdminApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [committee, setCommittee] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadApplications() {
      setLoading(true);
      setError("");
      try {
        const query = committee ? `?committee=${encodeURIComponent(committee)}` : "";
        const response = await fetch(`/api/admin/applications${query}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load applications.");
        setApplications(result.applications);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : "Could not load applications.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadApplications();
    return () => controller.abort();
  }, [committee]);

  return (
    <div className="admin-applications">
      <div className="application-filter">
        <label htmlFor="application-committee-filter">Filter by committee</label>
        <select id="application-committee-filter" value={committee} onChange={(event) => setCommittee(event.target.value)}>
          <option value="">All committees</option>
          {CLUB_COMMITTEES.map((item) => <option value={item} key={item}>{item}</option>)}
        </select>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? <p className="empty-note" role="status">Loading applications…</p> : (
        <div className="application-list">
          {applications.map((application) => (
            <article className="application-card" key={application.id}>
              <div className="application-card-heading">
                <div><h2>{application.name}</h2><a href={`mailto:${application.email}`}>{application.email}</a></div>
                <time dateTime={application.created_at}>{new Date(application.created_at).toLocaleDateString()}</time>
              </div>
              <ul className="join-committee-pills application-committee-pills" aria-label="Selected committees">
                {application.committees.map((item) => <li key={item}><span>{item}</span></li>)}
              </ul>
              <p>{application.message}</p>
            </article>
          ))}
          {!applications.length && !error && <p className="empty-note">No applications found for this committee.</p>}
        </div>
      )}
    </div>
  );
}
