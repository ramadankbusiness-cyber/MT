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
import { useState } from "react";
import { useTranslations } from "next-intl";
import { CommitteeSelect } from "@/components/committee-select";

type DbCommittee = { id: string; key: string; name: string; nameAr: string };
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
  committees: DbCommittee[];
  selectedCommittee: string;
  invalidFilter: boolean;
  summary: Summary;
  trend: Trend[];
  committeesReport: CommitteeReport[];
  members: MemberReport[];
  exportHref: string;
}) {
  const t = useTranslations("site.adminPages.reports");
  const [localCommittee, setLocalCommittee] = useState(selectedCommittee);
  return (
    <div className="attendance-reports">
      <form className="team-edit-form report-filters" method="get">
        <label>{t("from")}<input type="date" name="from" defaultValue={from} required /></label>
        <label>{t("to")}<input type="date" name="to" defaultValue={to} required /></label>
        {committees.length > 0 && (
          <label>{t("committee")}<CommitteeSelect
            committees={committees}
            value={localCommittee}
            onChange={(v) => setLocalCommittee(Array.isArray(v) ? "" : (v || ""))}
            mode="single"
            showAll={true}
            allLabel={t("all")}
            name="committeeId"
          /></label>
        )}
        <div className="report-filter-actions">
          <button className="button button-primary" type="submit">{t("apply")}</button>
          <a className="button button-secondary" href={exportHref}>{t("export")}</a>
        </div>
        {invalidFilter && <p className="form-error report-filter-error" role="status">{t("invalid")}</p>}
      </form>

      <div className="dashboard-stat-grid report-stat-grid" aria-label={t("summary")}>
        <article className="dashboard-stat"><span>{t("rate")}</span><strong>{summary.attendanceRate}%</strong></article>
        <article className="dashboard-stat"><span>{t("sessions")}</span><strong>{summary.sessions}</strong></article>
        <article className="dashboard-stat"><span>{t("presentLate")}</span><strong>{summary.present + summary.late}</strong></article>
        <article className="dashboard-stat"><span>{t("absentExcused")}</span><strong>{summary.absent} · {summary.excused}</strong></article>
      </div>

      <div className="report-chart-grid">
        <section className="dashboard-panel report-chart-panel">
          <div className="dashboard-panel-heading"><h2>{t("overTime")}</h2></div>
          {trend.length ? (
            <div className="report-chart" role="img" aria-label={t("dailyChart")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 12, right: 8, left: -20, bottom: 4 }}>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--line)", borderRadius: 12 }} labelStyle={{ color: "var(--ink)" }} />
                  <Bar dataKey="attended" name={t("presentOrLate")} fill="var(--a)" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="expected" name={t("expected")} fill="var(--b)" fillOpacity={0.45} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="empty-note">{t("noSessions")}</p>}
        </section>
        <section className="dashboard-panel report-chart-panel">
          <div className="dashboard-panel-heading"><h2>{t("byCommittee")}</h2></div>
          {committeesReport.length ? (
            <div className="report-chart" role="img" aria-label={t("committeeChart")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={committeesReport} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: "var(--muted)", fontSize: 10 }} />
                  <YAxis type="category" dataKey="committee" width={80} tick={{ fill: "var(--muted)", fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--line)", borderRadius: 12 }} labelStyle={{ color: "var(--ink)" }} />
                  <Bar dataKey="rate" name={t("rate")} fill="var(--a)" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="empty-note">{t("noCommitteeData")}</p>}
        </section>
      </div>

      <section className="team-edit-form report-member-panel">
        <h2>{t("byMember")}</h2>
        <div className="report-table-wrap">
          <table className="report-table">
            <thead><tr><th scope="col">{t("member")}</th><th scope="col">{t("committee")}</th><th scope="col">{t("attendance")}</th><th scope="col">{t("absent")}</th><th scope="col">{t("excused")}</th><th scope="col">{t("rate")}</th></tr></thead>
            <tbody>{members.map((member) => <tr key={member.id}>
              <th scope="row"><span>{member.name}</span></th>
              <td>{member.committee}</td>
              <td>{member.attended} / {member.eligible}</td>
              <td>{member.absent}</td>
              <td>{member.excused}</td>
              <td><span className="report-rate">{member.rate}%</span></td>
            </tr>)}</tbody>
          </table>
          {!members.length && <p className="empty-note">{t("empty")}</p>}
        </div>
      </section>
    </div>
  );
}
