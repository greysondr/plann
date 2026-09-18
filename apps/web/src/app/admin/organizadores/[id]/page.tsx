import { notFound } from "next/navigation";
import { eventsForOrganizer, findOrganizer, ordersForOrganizer } from "@/lib/mock-data";
import { OrganizerDetail } from "./OrganizerDetail";

export default async function OrganizerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const organizer = findOrganizer(id);
  if (!organizer) notFound();

  const events = eventsForOrganizer(id);
  const orders = ordersForOrganizer(id)
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 25);

  return <OrganizerDetail organizer={organizer} events={events} orders={orders} />;
}
