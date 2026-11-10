"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Committee = { id: string; name: string };
type Summary = { sessions: number; attendanceRate: number; present: number; late: number; absent: number; excused: number };
type Trend = { date: string; expected: number; attended: number };
type CommitteeReport = { committee: string; eligible: number; attended: number; excused: number; rate: number };
type MemberReport = { id: string; name: string; committee: string; attended: number; absent: number; excused: number; eligible: number; rate: number };

export function AttendanceReports({
  from,
  to,
  committees,
  selectedCommittee,
  invalidFilter,
  summary,
  trend,
  committeesReport,
  members,
  exportHref,
}: {
  from: string;
  to: string;
  committees: Committee[];
  selectedCommittee: string;
  invalidFilter: boolean;
  summary: Summary;
  trend: Trend[];
  committeesReport: CommitteeReport[];
  members: MemberReport[];
  exportHref: string;
}) {
  return (
    <div className="attendance-reports">
      <form className="team-edit-form report-filters" method="get">
        <label>From<input type="date" name="from" defaultValue={from} required /></label>
        <label>To<input type="date" name="to" defaultValue={to} required /></label>
        {committees.length > 0 && (
          <label>Committee<select name="committeeId" defaultValue={selectedCommittee}>
            <option value="">All committees</option>
            {committees.map((committee) => <option value={committee.id} key={committee.id}>{committee.name}</option>)}
          </select></label>
        )}
        <div className="report-filter-actions">
          <button className="button button-primary" type="submit">Apply filters</button>
          <a className="button button-secondary" href={exportHref}>Export CSV</a>
        </div>
        {invalidFilter && <p className="form-error report-filter-error" role="status">One or more filters were invalid. Showing the available report range.</p>}
      </form>

      <div className="dashboard-stat-grid report-stat-grid" aria-label="Attendance summary">
        <article className="dashboard-stat"><span>Attendance rate</span><strong>{summary.attendanceRate}%</strong></article>
        <article className="dashboard-stat"><span>Sessions</span><strong>{summary.sessions}</strong></article>
        <article className="dashboard-stat"><span>Present · late</span><strong>{summary.present + summary.late}</strong></article>
        <article className="dashboard-stat"><span>Absent · excused</span><strong>{summary.absent} · {summary.excused}</strong></article>
      </div>

      <div className="report-chart-grid">
        <section className="dashboard-panel report-chart-panel">
          <div className="dashboard-panel-heading"><h2>Attendance over time</h2></div>
          {trend.length ? (
            <div className="report-chart" role="img" aria-label="Daily attended members compared with expected attendance">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 12, right: 8, left: -20, bottom: 4 }}>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--line)", borderRadius: 12 }} labelStyle={{ color: "var(--ink)" }} />
                  <Bar dataKey="attended" name="Present or late" fill="var(--a)" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="expected" name="Expected" fill="var(--b)" fillOpacity={0.45} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="empty-note">No attendance sessions in this date range.</p>}
        </section>
        <section className="dashboard-panel report-chart-panel">
          <div className="dashboard-panel-heading"><h2>By committee</h2></div>
          {committeesReport.length ? (
            <div className="report-chart" role="img" aria-label="Attendance rate by committee">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={committeesReport} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: "var(--muted)", fontSize: 10 }} />
                  <YAxis type="category" dataKey="committee" width={80} tick={{ fill: "var(--muted)", fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--line)", borderRadius: 12 }} labelStyle={{ color: "var(--ink)" }} />
                  <Bar dataKey="rate" name="Attendance rate" fill="var(--a)" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="empty-note">No committee attendance data in this date range.</p>}
        </section>
      </div>

      <section className="team-edit-form report-member-panel">
        <h2>By member</h2>
        <div className="report-table-wrap">
          <table className="report-table">
            <thead><tr><th scope="col">Member</th><th scope="col">Committee</th><th scope="col">Attendance</th><th scope="col">Absent</th><th scope="col">Excused</th><th scope="col">Rate</th></tr></thead>
            <tbody>{members.map((member) => <tr key={member.id}>
              <th scope="row"><span>{member.name}</span></th>
              <td>{member.committee}</td>
              <td>{member.attended} / {member.eligible}</td>
              <td>{member.absent}</td>
              <td>{member.excused}</td>
              <td><span className="report-rate">{member.rate}%</span></td>
            </tr>)}</tbody>
          </table>
          {!members.length && <p className="empty-note">No members match this report.</p>}
        </div>
      </section>
    </div>
  );
}
