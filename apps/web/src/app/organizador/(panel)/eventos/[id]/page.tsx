import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrganizer } from "@/lib/org/session";
import { loadAnnouncements, loadAttendees, loadEvents, loadOrders, loadTickets } from "@/lib/org/data";
import { attendance, checkinsByHour, cumulativeTickets, funnel, sumBy } from "@/lib/org/analytics";
import { longDateTime, pct, shortDate, usd } from "@/lib/format";
import { Button, Card, CardHeader, EmptyState, PageHeader, StatCard, Table, Td, Th, Tr } from "@/components/ui";
import { AreaTrend, ColumnChart, Donut } from "@/components/org/charts";
import { EventStatusBadge, OrderStatusBadge, ProgressBar } from "@/components/org/bits";
import { AttendeesTable } from "@/components/org/Tables";
import { AnnouncementForm, CompForm } from "@/components/org/EventEngage";
import { duplicateEventAction, setSalesPausedAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizer } = await requireOrganizer();
  const events = await loadEvents(organizer.id);
  const event = events.find((e) => e.id === id);
  if (!event) notFound();

  const [orders, tickets, attendees, announcements] = await Promise.all([loadOrders([id]), loadTickets([id]), loadAttendees(id), loadAnnouncements(id)]);

  const sold = event.ticket_types.reduce((s, t) => s + t.sold, 0);
  const capacity = event.ticket_types.reduce((s, t) => s + t.quantity, 0);
  const paid = orders.filter((o) => o.status === "paid");
  const net = paid.reduce((s, o) => s + o.organizer_net_cents, 0);
  const gross = paid.reduce((s, o) => s + o.subtotal_cents, 0);
  const fun = funnel(orders);
  const att = attendance(tickets);
  const trend = cumulativeTickets(orders, event.status === "finished" ? new Date(event.starts_at) : new Date());
  const arrivals = checkinsByHour(tickets);
  const byType = sumBy(orders, (o) => o.ticket_type_id, new Map(event.ticket_types.map((t) => [t.id, t.name])));
  const typeName = new Map(event.ticket_types.map((t) => [t.id, t.name]));
  const closed = event.status === "cancelled" || event.status === "finished";
  const refundPending = orders.filter((o) => o.status === "refund_pending");

  return (
    <div className="space-y-6">
      <Link href="/organizador/eventos" className="text-[13px] font-bold text-foreground-3 hover:text-pink">
        ← Eventos
      </Link>
      <PageHeader
        title={event.title}
        subtitle={`${longDateTime(event.starts_at)} · ${event.venue_name ?? ""}${event.cities ? `, ${event.cities.name}` : ""}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <EventStatusBadge status={event.status} paused={event.sales_paused} />
            {!closed && (
              <>
                <form action={setSalesPausedAction.bind(null, event.id, !event.sales_paused)}>
                  <Button type="submit" variant="ghost">
                    {event.sales_paused ? "Reanudar ventas" : "Pausar ventas"}
                  </Button>
                </form>
                <Link href={`/organizador/eventos/${event.id}/editar`}>
                  <Button type="button">Editar</Button>
                </Link>
              </>
            )}
            <form action={duplicateEventAction.bind(null, event.id)}>
              <Button type="submit" variant="ghost">
                Duplicar
              </Button>
            </form>
          </div>
        }
      />

      {event.status === "cancelled" && (
        <Card className="border-danger/30 bg-danger-soft p-4 text-[13.5px] text-foreground">
          <span className="font-bold">Evento cancelado.</span> {event.cancelled_reason}
          {refundPending.length > 0 && ` Hay ${refundPending.length} compras por reembolsar; ya no cuentan en tu saldo.`}
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Ingresos netos" value={usd(net)} hint={`${usd(gross)} en ventas brutas`} />
        <StatCard label="Entradas vendidas" value={`${sold}/${capacity}`} hint={`${capacity ? pct(sold / capacity) : "0%"} del cupo`} />
        <StatCard label="Conversión" value={pct(fun.conversion)} hint={`${fun.paid} pagados, ${fun.expired + fun.cancelled} sin concretar`} />
        <StatCard label="Asistencia" value={att.issued > 0 && att.used > 0 ? pct(att.rate) : "—"} hint={`${att.used} de ${att.issued} han entrado`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Evolución de ventas" subtitle="Entradas vendidas acumuladas" />
          <div className="p-4">{trend.length === 0 ? <EmptyState title="Aún no hay ventas" /> : <AreaTrend data={trend.map((p) => ({ label: p.label, value: p.tickets }))} />}</div>
        </Card>
        <Card>
          <CardHeader title="Por tipo de entrada" />
          <div className="space-y-4 p-5">
            {event.ticket_types.map((t) => {
              const revenue = byType.find((s) => s.id === t.id)?.netCents ?? 0;
              return (
                <div key={t.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-bold text-foreground">{t.name}</span>
                    <span className="text-foreground-3">{t.price_cents === 0 ? "Gratis" : usd(t.price_cents)}</span>
                  </div>
                  <ProgressBar value={t.quantity ? t.sold / t.quantity : 0} />
                  <div className="flex items-center justify-between text-[12px] text-foreground-3">
                    <span>
                      {t.sold} de {t.quantity}
                      {t.reserved > 0 ? ` · ${t.reserved} reservadas` : ""}
                    </span>
                    <span className="font-bold text-pink">{usd(revenue)}</span>
                  </div>
                </div>
              );
            })}
            {byType.length > 1 && (
              <div className="border-t border-border pt-4">
                <Donut data={byType.map((s) => ({ name: s.name, value: s.netCents / 100 }))} />
              </div>
            )}
          </div>
        </Card>
      </div>

      {arrivals.length > 0 && (
        <Card>
          <CardHeader title="Llegada de asistentes" subtitle="Entradas validadas por hora" />
          <div className="p-4">
            <ColumnChart data={arrivals.map((a) => ({ label: a.label, value: a.count }))} label="Entradas" />
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Asistentes" subtitle="Quiénes compraron y quién ya entró" />
        <AttendeesTable eventId={event.id} eventTitle={event.title} attendees={attendees} />
      </Card>

      {!closed && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader title="Invitar a alguien" subtitle="Entradas de cortesía" />
            <div className="p-5">
              <CompForm eventId={event.id} types={event.ticket_types.map((t) => ({ id: t.id, name: t.name }))} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Avisar a los asistentes" subtitle="Cambios de hora, lugar u otra novedad" />
            <div className="space-y-4 p-5">
              <AnnouncementForm eventId={event.id} recipients={attendees.filter((a) => a.status === "valid" || a.status === "used").length} />
              {announcements.length > 0 && (
                <ul className="divide-y divide-border border-t border-border pt-2 text-[12.5px]">
                  {announcements.map((a) => (
                    <li key={a.id} className="py-2">
                      <p className="text-foreground-2">{a.message}</p>
                      <p className="text-foreground-3">
                        {shortDate(a.created_at)} · {a.recipients} {a.recipients === 1 ? "persona" : "personas"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader title="Pedidos del evento" />
        {orders.length === 0 ? (
          <EmptyState title="Sin pedidos todavía" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Entrada</Th>
                <Th className="text-right">Neto</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 15).map((o) => (
                <Tr key={o.id}>
                  <Td>{shortDate(o.created_at)}</Td>
                  <Td>
                    {o.quantity} × {typeName.get(o.ticket_type_id)}
                  </Td>
                  <Td className="text-right font-bold">{o.status === "paid" ? usd(o.organizer_net_cents) : "—"}</Td>
                  <Td>
                    <OrderStatusBadge status={o.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
