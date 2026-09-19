import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrganizer } from "@/lib/org/session";
import { loadCatalog, loadEvents, loadOrders } from "@/lib/org/data";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { EventForm } from "@/components/org/EventForm";
import { CancelEvent, SalesControl, TicketTypesManager } from "@/components/org/EventManage";
import { publishEventAction } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizer } = await requireOrganizer();
  const events = await loadEvents(organizer.id);
  const event = events.find((e) => e.id === id);
  if (!event) notFound();
  const { categories, cities } = await loadCatalog();
  const orders = event.status === "cancelled" ? [] : await loadOrders([event.id]);
  const paidOrders = orders.filter((o) => o.status === "paid").length;

  // categoría/ciudad por nombre -> id
  const categoryId = categories.find((c) => c.name === event.categories?.name)?.id ?? null;
  const cityId = cities.find((c) => c.name === event.cities?.name)?.id ?? null;

  if (event.status === "cancelled" || event.status === "finished") {
    return (
      <div className="max-w-3xl space-y-4">
        <PageHeader title={event.title} subtitle={event.status === "cancelled" ? `Cancelado: ${event.cancelled_reason ?? "sin motivo"}` : "Este evento ya finalizó y no se puede editar."} />
        <Link href={`/organizador/eventos/${event.id}`} className="text-[13px] font-bold text-pink">
          ← Ver analíticas
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Editar evento"
        subtitle={event.title}
        action={
          <Link href={`/organizador/eventos/${event.id}`} className="text-[13px] font-bold text-pink">
            ← Volver a analíticas
          </Link>
        }
      />
      {event.status === "draft" && (
        <Card className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <Badge tone="neutral">Borrador</Badge>
            <p className="text-[13px] text-foreground-2">Este evento todavía no es visible en la app.</p>
          </div>
          <form action={publishEventAction.bind(null, event.id)}>
            <Button type="submit">Publicar</Button>
          </form>
        </Card>
      )}
      <Card className="p-6">
        <EventForm
          mode="edit"
          categories={categories}
          cities={cities}
          event={{
            id: event.id,
            title: event.title,
            description: event.description,
            venue_name: event.venue_name,
            starts_at: event.starts_at,
            image: event.images[0],
            category_id: categoryId,
            city_id: cityId,
          }}
        />
      </Card>
      <TicketTypesManager eventId={event.id} types={event.ticket_types} />
      <SalesControl eventId={event.id} paused={event.sales_paused} />
      <CancelEvent eventId={event.id} paidOrders={paidOrders} />
    </div>
  );
}
