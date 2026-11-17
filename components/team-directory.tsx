"use client";

import Image from "next/image";
import { useMemo } from "react";
import { SectionHeading } from "@/components/section-heading";
import { useSite } from "@/components/site-provider";
import { useTranslations } from "next-intl";
import { getCommitteeLabel, getPositionLabel, POSITION_ORDER, type PositionLevel } from "@/data/committees";
import type { ManagedTeamMember } from "@/components/team-manager";

type DbCommittee = { id: string; key: string; name: string; nameAr: string };

function compareMembers(a: ManagedTeamMember, b: ManagedTeamMember) {
  const ap = POSITION_ORDER[(a.position ?? "LEADER") as PositionLevel] ?? 2;
  const bp = POSITION_ORDER[(b.position ?? "LEADER") as PositionLevel] ?? 2;
  return ap - bp || (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name);
}

function MemberCard({ member, index, large = false }: { member: ManagedTeamMember; index: number; large?: boolean }) {
  const { language } = useSite();
  const pages = useTranslations("site.pages.team");
  const position = (member.position ?? "LEADER") as PositionLevel;
  const badgeClass = position === "HEAD" ? "is-head" : position === "VICE" ? "is-vice" : "is-leader";
  const committeeTag = member.isMTC && !member.committee ? "MTC" : getCommitteeLabel(member.committee?.name, language);
  return (
    <article className={`team-card team-tone-${index % 4}${large ? " team-card-mtc" : ""}`} key={member.id} data-position={position}>
      <div className="team-avatar">
        {member.photoUrl
          ? <Image src={member.photoUrl} alt={member.name} fill sizes={large ? "(max-width: 640px) 95vw, (max-width: 1024px) 50vw, 320px" : "(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 260px"} unoptimized />
          : <span aria-hidden="true">{member.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>}
      </div>
      <div className="team-card-copy">
        <p className="team-role">{language === "ar" ? member.titleAr ?? member.title : member.title}</p>
        <h2>{member.name}</h2>
        <div className="team-badges">
          <span className={`position-badge ${badgeClass}`}>{getPositionLabel(position, language)}</span>
          {committeeTag && <span className="committee-tag">{committeeTag}</span>}
        </div>
        {(language === "ar" ? member.bioAr ?? member.bio : member.bio) && <p>{language === "ar" ? member.bioAr ?? member.bio : member.bio}</p>}
        {member.socialLinks && <div className="team-socials">
          {member.socialLinks.website && <a href={member.socialLinks.website} target="_blank" rel="noreferrer">{pages("website")}</a>}
          {member.socialLinks.linkedin && <a href={member.socialLinks.linkedin} target="_blank" rel="noreferrer">{pages("linkedin")}</a>}
          {member.socialLinks.instagram && <a href={member.socialLinks.instagram} target="_blank" rel="noreferrer">{pages("instagram")}</a>}
        </div>}
      </div>
    </article>
  );
}

export function TeamDirectory({ members, committees = [] }: { members: ManagedTeamMember[]; committees?: DbCommittee[] }) {
  const { language, text } = useSite();
  const pages = useTranslations("site.pages.team");

  const mtcMembers = useMemo(() => members.filter((m) => m.isMTC).sort(compareMembers), [members]);
  const grouped = useMemo(() => {
    const map = new Map<string, { committee: DbCommittee; members: ManagedTeamMember[] }>();
    for (const committee of committees) {
      if (committee.key === "mtc") continue;
      map.set(committee.id, { committee, members: [] });
    }
    for (const member of members) {
      if (!member.committeeId) continue;
      if (member.committee?.key === "mtc") continue;
      const group = map.get(member.committeeId);
      if (group) group.members.push(member);
      else if (member.committee && (member.committee as DbCommittee).key !== "mtc") {
        map.set(member.committeeId, { committee: member.committee as DbCommittee, members: [member] });
      }
    }
    return [...map.values()].map((g) => ({ ...g, members: g.members.sort(compareMembers) })).filter((g) => g.members.length > 0);
  }, [members, committees]);

  const hasAny = mtcMembers.length > 0 || grouped.length > 0;
  return (
    <>
      <SectionHeading eyebrow={text.team.eyebrow} title={text.team.title} lead={text.team.lead} />
      {!hasAny ? <p className="empty-note">{pages("empty")}</p> : (
        <div className="team-sections">
          {mtcMembers.length > 0 && (
            <section className="team-group team-group-mtc" aria-labelledby="team-mtc-title">
              <div className="team-group-heading">
                <h2 id="team-mtc-title">MTC</h2>
                <p>{language === "ar" ? "هيدات الفريق" : "The heads of the team"}</p>
              </div>
              <div className="team-grid team-grid-mtc">
                {mtcMembers.map((member, index) => <MemberCard key={member.id} member={member} index={index} large />)}
              </div>
            </section>
          )}
          {grouped.map((group, gi) => (
            <section className="team-group" key={group.committee.id} aria-labelledby={`team-group-${group.committee.id}`}>
              <div className="team-group-heading">
                <h2 id={`team-group-${group.committee.id}`}>{language === "ar" ? group.committee.nameAr : group.committee.name}</h2>
              </div>
              <div className="team-grid">
                {group.members.map((member, index) => <MemberCard key={`${member.id}-${gi}`} member={member} index={index} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
