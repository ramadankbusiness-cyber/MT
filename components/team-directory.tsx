"use client";

import Image from "next/image";
import { SectionHeading } from "@/components/section-heading";
import { useSite } from "@/components/site-provider";
import type { ManagedTeamMember } from "@/components/team-manager";

export function TeamDirectory({ members }: { members: ManagedTeamMember[] }) {
  const { language, text } = useSite();
  return (
    <>
      <SectionHeading eyebrow={text.team.eyebrow} title={text.team.title} lead={text.team.lead} />
      {members.length ? <div className="team-grid">{members.map((member, index) => (
        <article className={`team-card team-tone-${index % 4}`} key={member.id}>
          <div className="team-avatar">
            {member.photoUrl
              ? <Image src={member.photoUrl} alt={member.name} fill sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 260px" unoptimized />
              : <span aria-hidden="true">{member.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>}
          </div>
          <div className="team-card-copy">
            <p className="team-role">{language === "ar" ? member.titleAr ?? member.title : member.title}</p>
            <h2>{member.name}</h2>
            <p className="team-committee">{member.committee.name}</p>
            {(language === "ar" ? member.bioAr ?? member.bio : member.bio) && <p>{language === "ar" ? member.bioAr ?? member.bio : member.bio}</p>}
            {member.socialLinks && <div className="team-socials">
              {member.socialLinks.website && <a href={member.socialLinks.website} target="_blank" rel="noreferrer">Website</a>}
              {member.socialLinks.linkedin && <a href={member.socialLinks.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>}
              {member.socialLinks.instagram && <a href={member.socialLinks.instagram} target="_blank" rel="noreferrer">Instagram</a>}
            </div>}
          </div>
        </article>
      ))}</div> : <p className="empty-note">{language === "ar" ? "يجري تحديث الفريق. يرجى العودة قريبًا." : "Our team is being updated. Please check back soon."}</p>}
    </>
  );
}
