"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Hammer, Users, type LucideIcon } from "lucide-react";
import { features, principles, stats } from "@/data/site";
import { useSite } from "./site-provider";

const icons: Record<string, LucideIcon> = { sparkles: BookOpen, hammer: Hammer, users: Users };

export function HomeContent() {
  const { text, language } = useSite();
  const home = text.home;
  return (
    <>
      <section className="hero-section">
        <div className="hero-glow hero-glow-a" />
        <div className="hero-glow hero-glow-b" />
        <div className="hero-content">
          <p className="status-pill"><span className="status-dot" />{home.badge}</p>
          <h1>{language === "ar" ? <>حيث تصنع العقول <span className="gradient-text">الطموحة معًا.</span></> : <>Where ambitious minds <span className="gradient-text">build together.</span></>}</h1>
          <p className="hero-lead">{home.lead}</p>
          <div className="hero-actions">
            <Link className="button button-primary button-large" href="/join">{home.become}<ArrowRight size={17} aria-hidden="true" /></Link>
            <Link className="button button-secondary button-large" href="/events">{home.eventsButton}</Link>
          </div>
        </div>
        <div className="stats-strip" aria-label="MT Club at a glance">
          {stats.map((stat) => (
            <div className="stat-cell" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{language === "ar" ? stat.labelAr : stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="content-section what-section">
        <div className="section-heading">
          <p className="eyebrow">{home.whatEyebrow}</p>
          <h2>{home.whatTitle}</h2>
        </div>
        <div className="feature-grid">
          {features.map((feature) => {
            const Icon = icons[feature.icon];
            return (
              <article className="feature-card" key={feature.title}>
                <div className="icon-tile"><Icon size={22} strokeWidth={1.8} aria-hidden="true" /></div>
                <h3>{language === "ar" ? feature.titleAr : feature.title}</h3>
                <p>{language === "ar" ? feature.descriptionAr : feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="content-section cta-section">
        <div className="cta-panel">
          <div>
            <p className="eyebrow">{language === "ar" ? "المكان يتّسع لك" : "YOUR NEXT CHAPTER"}</p>
            <h2>{home.ctaTitle}</h2>
            <p>{home.ctaText}</p>
          </div>
          <Link className="button button-secondary button-large" href="/join">{home.ctaButton}<ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
      </section>
    </>
  );
}

export function PrincipleCards() {
  const { language } = useSite();
  return (
    <div className="feature-grid">
      {principles.map((item, index) => (
        <article className="feature-card principle-card" key={item.title}>
          <span className="principle-number">0{index + 1}</span>
          <h2>{language === "ar" ? item.titleAr : item.title}</h2>
          <p>{language === "ar" ? item.descriptionAr : item.description}</p>
        </article>
      ))}
    </div>
  );
}
