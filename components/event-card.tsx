"use client";

import { CalendarDays } from "lucide-react";
import type { ClubEvent } from "@/data/events";
import { useSite } from "./site-provider";

export function EventCard({ event }: { event: ClubEvent }) {
  const { language, text } = useSite();
  const eventDate = new Date(`${event.date}T12:00:00`);
  const day = new Intl.DateTimeFormat(language, { day: "2-digit" }).format(eventDate);
  const month = new Intl.DateTimeFormat(language, { month: "short" }).format(eventDate);
  return (
    <article className="event-card">
      <div className="date-tile" aria-label={eventDate.toLocaleDateString(language)}>
        <strong>{day}</strong><span>{month}</span>
      </div>
      <div className="event-copy">
        <span className="event-status"><span className="status-dot" />{event.status === "Upcoming" ? text.events.upcoming : text.events.recent}</span>
        <h2>{language === "ar" ? event.titleAr : event.title}</h2>
        <p>{language === "ar" ? event.descriptionAr : event.description}</p>
      </div>
      <CalendarDays className="event-icon" size={22} aria-hidden="true" />
    </article>
  );
}
