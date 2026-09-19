import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requireOrganizer } from "@/lib/org/session";
import { eventNames, loadBalance, loadEvents, loadOrders, loadTickets, ticketTypeNames } from "@/lib/org/data";
import {
  attendance,
  buyerStats,
  dailySeries,
  deltaPct,
  funnel,
  sumBy,
  totalsBetween,
  weekdayDistribution,
} from "@/lib/org/analytics";
import { longDateTime, pct, shortDate, usd } from "@/lib/format";
import { Card, CardHeader, EmptyState, PageHeader, StatCard, Table, Td, Th, Tr } from "@/components/ui";
import { ColumnChart, Donut, HorizontalBars, SalesChart } from "@/components/org/charts";
import { EventStatusBadge, OrderStatusBadge, ProgressBar, RangeTabs, Thumb, deltaText } from "@/components/org/bits";

export const dynamic = "force-dynamic";

const DAY = 24 * 3600 * 1000;

export default async function OrganizerDashboard({ searchParams }: { searchParams: Promise<{ rango?: string }> }) {
  const { organizer } = await requireOrganizer();
  const { rango } = await searchParams;
  const range = [7, 30, 90].includes(Number(rango)) ? Number(rango) : 30;

  const events = await loadEvents(organizer.id);
  const eventIds = events.map((e) => e.id);
  const [orders, tickets, balance] = await Promise.all([loadOrders(eventIds), loadTickets(eventIds), loadBalance(organizer.id)]);

  const now = new Date();
  const cur = totalsBetween(orders, new Date(now.getTime() - range * DAY), new Date(now.getTime() + 1));
  const prev = totalsBetween(orders, new Date(now.getTime() - 2 * range * DAY), new Date(now.getTime() - range * DAY));
  const series = dailySeries(orders, range, now);

  const inRange = orders.filter((o) => new Date(o.created_at).getTime() >= now.getTime() - range * DAY);
  const fun = funnel(inRange);
  const buyers = buyerStats(orders);
  const pendingPayments = orders.filter((o) => o.status === "in_verification" || o.status === "pending_payment").length;
  const finishedIds = new Set(events.filter((e) => e.status === "finished").map((e) => e.id));
  const att = attendance(tickets.filter((t) => finishedIds.has(t.event_id)));

  const byEvent = sumBy(orders.filter((o) => new Date(o.created_at).getTime() >= now.getTime() - range * DAY), (o) => o.event_id, eventNames(events));
  const byType = sumBy(orders, (o) => o.ticket_type_id, ticketTypeNames(events));
  const weekday = weekdayDistribution(inRange);

  const upcoming = events
    .filter((e) => ["published", "sold_out", "live"].includes(e.status) && new Date(e.starts_at).getTime() >= now.getTime() - DAY)
    .sort((a, b) => (a.starts_at < b.starts_at ? -1 : 1))
    .slice(0, 4);
  const names = eventNames(events);
  const typeNames = new Map(events.flatMap((e) => e.ticket_types.map((t) => [t.id, t.name] as const)));
  const avgOrder = cur.orders > 0 ? cur.grossCents / cur.orders : 0;
  const netDelta = deltaText(deltaPct(cur.netCents, prev.netCents));
  const ticketsDelta = deltaText(deltaPct(cur.tickets, prev.tickets));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hola, ${organizer.name}`}
        subtitle={`Resumen de los últimos ${range} días, comparado con los ${range} anteriores.`}
        action={<RangeTabs current={range} basePath="/organizador" />}
      />

      {pendingPayments > 0 && (
        <Card className="flex items-center gap-3 border-warning/30 bg-warning-soft px-5 py-3.5">
          <AlertTriangle size={18} className="shrink-0 text-warning" />
          <p className="text-[13.5px] text-foreground">
            <span className="font-bold">{pendingPayments}</span> {pendingPayments === 1 ? "compra está" : "compras están"} pendientes de pago o en
            verificación. Se acreditan a tu saldo cuando Plann confirma el pago.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Ingresos netos" value={usd(cur.netCents)} delta={netDelta?.text} deltaTone={netDelta?.tone} hint={`vs ${usd(prev.netCents)}`} />
        <StatCard label="Entradas vendidas" value={String(cur.tickets)} delta={ticketsDelta?.text} deltaTone={ticketsDelta?.tone} hint={`${cur.orders} pedidos`} />
        <StatCard label="Saldo disponible" value={usd(balance.balance_available_cents)} hint={balance.pending_withdrawal_cents > 0 ? `${usd(balance.pending_withdrawal_cents)} en proceso` : "listo para retirar"} />
        <StatCard label="Pedido promedio" value={usd(avgOrder)} hint="antes de comisión" />
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Conversión de pedidos" value={pct(fun.conversion)} hint={`${fun.paid} pagados de ${fun.total - fun.pending} resueltos`} />
        <StatCard label="Asistencia" value={att.issued > 0 ? pct(att.rate) : "—"} hint={att.issued > 0 ? `${att.used} de ${att.issued} en eventos finalizados` : "aún no hay eventos finalizados"} />
        <StatCard label="Compradores" value={String(buyers.buyers)} hint={`${pct(buyers.repeatRate)} han vuelto a comprar`} />
        <StatCard label="Eventos activos" value={String(events.filter((e) => ["published", "sold_out", "live"].includes(e.status)).length)} hint={`${events.length} en total`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Ventas por día" subtitle="Ingresos netos (área) y entradas vendidas (línea)" />
          <div className="p-4">{cur.orders + prev.orders === 0 ? <EmptyState title="Sin ventas en este período" /> : <SalesChart data={series} />}</div>
        </Card>
        <Card>
          <CardHeader title="Ingresos por tipo de entrada" subtitle="Histórico" />
          <div className="p-5">
            {byType.length === 0 ? (
              <EmptyState title="Sin ventas todavía" />
            ) : (
              <Donut data={byType.slice(0, 6).map((s) => ({ name: s.name.split(" · ")[0] + " · " + (s.name.split(" · ")[1] ?? "").slice(0, 18), value: s.netCents / 100 }))} />
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Ingresos por evento" subtitle={`Últimos ${range} días`} />
          <div className="p-4">
            {byEvent.length === 0 ? (
              <EmptyState title="Sin ventas en este período" />
            ) : (
              <HorizontalBars data={byEvent.slice(0, 6).map((s) => ({ name: s.name, value: s.netCents / 100 }))} />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Cuándo compran" subtitle="Entradas por día de la semana" />
          <div className="p-4">
            <ColumnChart data={weekday.map((d) => ({ label: d.label, value: d.tickets }))} />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Próximos eventos" action={<Link href="/organizador/eventos" className="text-[12.5px] font-bold text-pink">Ver todos</Link>} />
          {upcoming.length === 0 ? (
            <EmptyState title="No tienes eventos próximos" subtitle="Publica uno para empezar a vender." />
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((e) => {
                const sold = e.ticket_types.reduce((s, t) => s + t.sold, 0);
                const cap = e.ticket_types.reduce((s, t) => s + t.quantity, 0);
                return (
                  <li key={e.id} className="space-y-2 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Thumb src={e.images[0]} alt={e.title} />
                      <div className="min-w-0 flex-1">
                        <Link href={`/organizador/eventos/${e.id}`} className="block truncate text-[13.5px] font-bold text-foreground hover:text-pink">
                          {e.title}
                        </Link>
                        <p className="text-[12px] text-foreground-3">{longDateTime(e.starts_at)}</p>
                      </div>
                    </div>
                    <ProgressBar value={cap ? sold / cap : 0} />
                    <div className="flex items-center justify-between text-[12px] text-foreground-3">
                      <span>
                        {sold} de {cap} vendidas
                      </span>
                      <EventStatusBadge status={e.status} paused={e.sales_paused} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Últimos pedidos" action={<Link href="/organizador/ventas" className="text-[12.5px] font-bold text-pink">Ver todos</Link>} />
          {orders.length === 0 ? (
            <EmptyState title="Todavía no hay pedidos" subtitle="Cuando alguien compre, aparece aquí al instante." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Fecha</Th>
                  <Th>Evento</Th>
                  <Th>Entrada</Th>
                  <Th className="text-right">Neto</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 8).map((o) => (
                  <Tr key={o.id}>
                    <Td>{shortDate(o.created_at)}</Td>
                    <Td className="max-w-[200px] truncate font-semibold text-foreground">{names.get(o.event_id)}</Td>
                    <Td>
                      {o.quantity} × {typeNames.get(o.ticket_type_id)}
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
    </div>
  );
}
