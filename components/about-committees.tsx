"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { CalendarCheck, Camera, Code2, Handshake, HeartPulse, Users, Truck, Shield, type LucideIcon } from "lucide-react";
import { CLUB_COMMITTEES, committeeDetails, type CommitteeIcon } from "@/data/committees";
import { useSite } from "@/components/site-provider";

const icons: Record<CommitteeIcon, LucideIcon> = {
  CalendarCheck,
  Users,
  Handshake,
  Code2,
  Truck,
  Camera,
  HeartPulse,
  Shield,
};

export function AboutCommittees() {
  const { language, text } = useSite();
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cards = gridRef.current?.querySelectorAll<HTMLElement>(".committee-card");
    if (!cards) return;
    if (!("IntersectionObserver" in window)) {
      cards.forEach((card) => card.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="committee-section" aria-labelledby="committees-title">
      <div className="section-heading committee-section-heading">
        <p className="eyebrow">{text.committees.eyebrow}</p>
        <h2 id="committees-title">{text.committees.titleStart} <span className="gradient-text">{text.committees.titleGradient}</span></h2>
        <p className="section-lead">{text.committees.subtitle}</p>
      </div>
      <div className="feature-grid committee-grid" ref={gridRef}>
        {CLUB_COMMITTEES.map((name, index) => {
          const committee = committeeDetails[name];
          const Icon = icons[committee.icon];
          return (
            <article
              className="feature-card committee-card"
              key={name}
              style={{ "--committee-delay": `${index * 70}ms` } as CSSProperties}
            >
              <div className="committee-card-top">
                <div className="icon-tile committee-icon-tile"><Icon size={22} strokeWidth={1.8} aria-hidden="true" /></div>
                <span className="principle-number">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <h3>{name}</h3>
              <p className="committee-full-name">{language === "ar" ? committee.fullNameAr : committee.fullName}</p>
              <p>{language === "ar" ? committee.descriptionAr : committee.description}</p>
            </article>
          );
        })}
      </div>
      <div className="committee-cta">
        <Link className="button button-primary button-large" href="/join">{text.committees.join}</Link>
      </div>
    </section>
  );
}
