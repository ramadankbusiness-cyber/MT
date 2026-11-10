"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import type { ClubEvent } from "@/data/events";
import { EventCard } from "@/components/event-card";
import { SectionHeading } from "@/components/section-heading";
import { useSite } from "@/components/site-provider";
import { useSession } from "next-auth/react";

export function EventsDirectory({ events }: { events: ClubEvent[] }) {
  const { text } = useSite();
  const { data: session } = useSession();
  return (
    <section className="content-section page-intro">
      <SectionHeading eyebrow={text.events.eyebrow} title={text.events.title} />
      {(session?.user?.role === "ADMIN" || session?.user?.role === "LEADER") && <div className="event-admin-link"><Link className="button button-secondary" href="/admin/events">Manage events</Link></div>}
      {events.length ? (
        <div className="event-list">{events.map((event) => <EventCard key={`${event.date}-${event.title}`} event={event} />)}</div>
      ) : (
        <div className="empty-events"><CalendarClock size={30} aria-hidden="true" /><h2>{text.events.empty}</h2><p>{text.events.emptyHint}</p></div>
      )}
    </section>
  );
}
