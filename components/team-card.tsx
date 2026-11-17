"use client";

import Image from "next/image";
import type { TeamMember } from "@/data/team";
import { useSite } from "./site-provider";

export function TeamCard({ member, index }: { member: TeamMember; index: number }) {
  const { language } = useSite();
  const initials = member.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <article className={`team-card team-tone-${index % 4}`}>
      <div className="team-avatar">
        {member.image ? (
          <Image src={member.image} alt={member.name} fill sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 260px" />
        ) : <span aria-hidden="true">{initials}</span>}
      </div>
      <div className="team-card-copy">
        <p className="team-role">{member.title || (language === "ar" ? member.roleAr : member.role)}</p>
        <h2>{member.name}</h2>
        {member.committee && <p className="team-committee">{member.committee}</p>}
        <p>{language === "ar" ? member.descriptionAr : member.description}</p>
      </div>
    </article>
  );
}
