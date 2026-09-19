import Link from "next/link";
import clsx from "clsx";
import { requireOrganizer } from "@/lib/org/session";
import { loadEvents, loadOrders } from "@/lib/org/data";
import { funnel } from "@/lib/org/analytics";
import { pct, usd } from "@/lib/format";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/ui";
import { SalesTable } from "@/components/org/Tables";

export const dynamic = "force-dynamic";

const STATES = [
  { id: "todos", label: "Todos" },
  { id: "paid", label: "Pagados" },
  { id: "pendientes", label: "Pendientes" },
  { id: "sin_concretar", label: "Sin concretar" },
  { id: "reembolsos", label: "Reembolsos" },
];

const MATCH: Record<string, (s: string) => boolean> = {
  todos: () => true,
  paid: (s) => s === "paid",
  pendientes: (s) => s === "pending_payment" || s === "in_verification",
  sin_concretar: (s) => s === "expired" || s === "cancelled",
  reembolsos: (s) => s === "refund_pending" || s === "refunded" || s === "partially_refunded",
};

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ evento?: string; estado?: string }> }) {
  const { organizer } = await requireOrganizer();
  const { evento, estado } = await searchParams;
  const state = MATCH[estado ?? ""] ? estado! : "todos";

  const events = await loadEvents(organizer.id);
  const orders = await loadOrders(events.map((e) => e.id));
  const eventTitle = new Map(events.map((e) => [e.id, e.title]));
  const typeName = new Map(events.flatMap((e) => e.ticket_types.map((t) => [t.id, t.name] as const)));

  const scoped = orders.filter((o) => (!evento || o.event_id === evento) && MATCH[state](o.status));
  const paid = scoped.filter((o) => o.status === "paid");
  const fun = funnel(orders.filter((o) => !evento || o.event_id === evento));
  const href = (e: string | undefined, s: string) => `/organizador/ventas?${new URLSearchParams({ ...(e ? { evento: e } : {}), estado: s })}`;

  return (
    <div className="space-y-6">
      <PageHeader title="Ventas" subtitle="Todos los pedidos de tus eventos, con lo que te queda después de la comisión." />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Venta bruta" value={usd(paid.reduce((s, o) => s + o.subtotal_cents, 0))} hint="según el filtro" />
        <StatCard label="Comisión Plann" value={usd(paid.reduce((s, o) => s + o.commission_cents, 0))} hint={`${Math.round(organizer.commission_rate * 100)}% de la venta`} />
        <StatCard label="Neto para ti" value={usd(paid.reduce((s, o) => s + o.organizer_net_cents, 0))} />
        <StatCard label="Conversión" value={pct(fun.conversion)} hint={`${fun.paid} pagados de ${fun.total - fun.pending} resueltos`} />
      </div>

      <Card>
        <CardHeader title="Pedidos" />
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <div className="inline-flex flex-wrap rounded-full border border-border-strong bg-surface p-1">
            {STATES.map((s) => (
              <Link key={s.id} href={href(evento, s.id)} className={clsx("rounded-full px-3.5 py-1.5 text-[12.5px] font-bold", s.id === state ? "bg-pink text-white" : "text-foreground-2 hover:bg-surface-muted")}>
                {s.label}
              </Link>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-[12.5px]">
            <span className="font-bold text-foreground-3">Evento:</span>
            <Link href={href(undefined, state)} className={clsx("rounded-full px-3 py-1 font-bold", !evento ? "bg-foreground text-white" : "text-foreground-2 hover:bg-surface-muted")}>
              Todos
            </Link>
            {events.map((e) => (
              <Link key={e.id} href={href(e.id, state)} className={clsx("max-w-[180px] truncate rounded-full px-3 py-1 font-bold", evento === e.id ? "bg-foreground text-white" : "text-foreground-2 hover:bg-surface-muted")}>
                {e.title}
              </Link>
            ))}
          </div>
        </div>
        <SalesTable
          key={`${evento}-${state}`}
          sales={scoped.map((o) => ({
            id: o.id,
            date: o.paid_at ?? o.created_at,
            event: eventTitle.get(o.event_id) ?? "",
            ticket: typeName.get(o.ticket_type_id) ?? "",
            quantity: o.quantity,
            gross: o.subtotal_cents,
            commission: o.commission_cents,
            net: o.organizer_net_cents,
            status: o.status,
            currency: o.currency_paid,
          }))}
        />
      </Card>
    </div>
  );
}
