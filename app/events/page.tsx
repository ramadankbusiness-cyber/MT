import { prisma } from "@/lib/prisma";
import { events as fallbackEvents } from "@/data/events";
import { EventsDirectory } from "@/components/events-directory";

export const dynamic = "force-dynamic";
export const metadata = { title: "Events" };

export default async function EventsPage() {
  const events = process.env.DATABASE_URL
    ? await prisma.event.findMany({ where: { published: true }, orderBy: { startsAt: "asc" }, take: 100 })
    : [];
  const now = new Date();
  const publicEvents = events.length ? events.map((event) => ({
    date: event.startsAt.toISOString().slice(0, 10),
    title: event.title,
    titleAr: event.title,
    description: event.description,
    descriptionAr: event.description,
    status: (event.startsAt >= now ? "Upcoming" : "Recent") as "Upcoming" | "Recent",
    statusAr: (event.startsAt >= now ? "قادم" : "حديث") as "قادم" | "حديث",
  })) : fallbackEvents;
  return <main id="main-content" className="inner-page"><EventsDirectory events={publicEvents} /></main>;
}
