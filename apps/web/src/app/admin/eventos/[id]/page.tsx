import { notFound } from "next/navigation";
import { findEvent, findOrganizer, orders } from "@/lib/mock-data";
import { EventDetail } from "./EventDetail";

export default async function EventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = findEvent(id);
  if (!event) notFound();
  const organizer = findOrganizer(event.organizerId);
  const eventOrders = orders
    .filter((o) => o.eventId === id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 20);

  return <EventDetail event={event} organizerName={organizer?.name ?? "—"} orders={eventOrders} />;
}
