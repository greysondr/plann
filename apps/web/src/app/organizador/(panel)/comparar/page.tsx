import Link from "next/link";
import { requireOrganizer } from "@/lib/org/session";
import { loadEvents, loadOrders, loadTickets, loadViews } from "@/lib/org/data";
import { compareEvents } from "@/lib/org/analytics";
import { longDateTime, pct, usd } from "@/lib/format";
import { Card, CardHeader, EmptyState, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { HorizontalBars } from "@/components/org/charts";
import { EventStatusBadge, ProgressBar } from "@/components/org/bits";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  const { organizer } = await requireOrganizer();
  const events = await loadEvents(organizer.id);
  const ids = events.map((e) => e.id);
  const [orders, tickets, views] = await Promise.all([loadOrders(ids), loadTickets(ids), loadViews(ids, 90)]);
  const rows = compareEvents(
    events.map((e) => ({ id: e.id, title: e.title, starts_at: e.starts_at, status: e.status, capacity: e.ticket_types.reduce((s, t) => s + t.quantity, 0) })),
    orders,
    tickets,
    views
  ).sort((a, b) => b.netCents - a.netCents);

  return (
    <div className="space-y-6">
      <PageHeader title="Comparar eventos" subtitle="Cuál vende más, cuál llena y cuál convierte mejor las visitas." />
      {rows.length === 0 ? (
        <Card>
          <EmptyState title="Todavía no tienes eventos" />
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader title="Ingresos netos por evento" />
            <div className="p-4">
              <HorizontalBars data={rows.map((r) => ({ name: r.title, value: r.netCents / 100 }))} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Comparativa" subtitle="Ordenado por ingresos" />
            <Table>
              <thead>
                <tr>
                  <Th>Evento</Th>
                  <Th className="text-right">Neto</Th>
                  <Th>Ocupación</Th>
                  <Th className="text-right">Ticket prom.</Th>
                  <Th className="text-right">Visitas</Th>
                  <Th className="text-right">Visita → compra</Th>
                  <Th className="text-right">Conversión</Th>
                  <Th className="text-right">Asistencia</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <Tr key={r.eventId}>
                    <Td>
                      <Link href={`/organizador/eventos/${r.eventId}`} className="font-semibold text-foreground hover:text-pink">
                        {r.title}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-foreground-3">
                        {longDateTime(r.startsAt)} <EventStatusBadge status={r.status} />
                      </div>
                    </Td>
                    <Td className="text-right font-bold">{usd(r.netCents)}</Td>
                    <Td className="min-w-[150px]">
                      <ProgressBar value={r.sellThrough} />
                      <span className="text-[11.5px] text-foreground-3">
                        {r.tickets} de {r.capacity} · {pct(r.sellThrough)}
                      </span>
                    </Td>
                    <Td className="text-right">{r.tickets ? usd(r.avgTicketCents) : "—"}</Td>
                    <Td className="text-right">{r.views}</Td>
                    <Td className="text-right">{r.viewToPurchase === null ? "—" : pct(r.viewToPurchase)}</Td>
                    <Td className="text-right">{pct(r.conversion)}</Td>
                    <Td className="text-right">{r.attendanceRate === null ? "—" : pct(r.attendanceRate)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
