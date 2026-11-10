"use client";

import { PrincipleCards } from "@/components/home-sections";
import { SectionHeading } from "@/components/section-heading";
import { useSite } from "@/components/site-provider";

export default function AboutPage() {
  const { text } = useSite();
  return (
    <main id="main-content" className="inner-page">
      <section className="content-section page-intro">
        <SectionHeading eyebrow={text.about.eyebrow} title={text.about.title} lead={text.about.lead} gradientLastWord />
        <PrincipleCards />
      </section>
    </main>
  );
}
