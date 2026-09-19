import Link from "next/link";
import { requireOrganizer } from "@/lib/org/session";
import { loadEvents, loadOrders } from "@/lib/org/data";
import { sumBy } from "@/lib/org/analytics";
import { longDateTime, usd } from "@/lib/format";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { EventStatusBadge, ProgressBar, Thumb } from "@/components/org/bits";
import { duplicateEventAction } from "../actions";
import clsx from "clsx";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "proximos", label: "Próximos" },
  { id: "finalizados", label: "Finalizados" },
  { id: "cancelados", label: "Cancelados" },
  { id: "todos", label: "Todos" },
];

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { organizer } = await requireOrganizer();
  const { ver } = await searchParams;
  const tab = TABS.some((t) => t.id === ver) ? ver! : "proximos";

  const events = await loadEvents(organizer.id);
  const orders = await loadOrders(events.map((e) => e.id));
  const revenue = new Map(sumBy(orders, (o) => o.event_id, new Map()).map((s) => [s.id, s.netCents]));

  const filtered = events.filter((e) => {
    if (tab === "todos") return true;
    if (tab === "cancelados") return e.status === "cancelled";
    if (tab === "finalizados") return e.status === "finished";
    return !["cancelled", "finished"].includes(e.status);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Eventos"
        subtitle="Publica, edita y sigue las ventas de cada evento."
        action={
          <Link href="/organizador/eventos/nuevo">
            <Button type="button">Nuevo evento</Button>
          </Link>
        }
      />

      <div className="inline-flex rounded-full border border-border-strong bg-surface p-1">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/organizador/eventos?ver=${t.id}`}
            className={clsx("rounded-full px-4 py-1.5 text-[12.5px] font-bold", t.id === tab ? "bg-pink text-white" : "text-foreground-2 hover:bg-surface-muted")}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState title="No hay eventos aquí" subtitle="Publica uno nuevo para empezar a vender entradas." />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((e) => {
            const sold = e.ticket_types.reduce((s, t) => s + t.sold, 0);
            const cap = e.ticket_types.reduce((s, t) => s + t.quantity, 0);
            return (
              <Card key={e.id} className="overflow-hidden">
                <div className="flex gap-4 p-4">
                  <Thumb src={e.images[0]} alt={e.title} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/organizador/eventos/${e.id}`} className="truncate text-[15px] font-extrabold text-foreground hover:text-pink">
                        {e.title}
                      </Link>
                      <EventStatusBadge status={e.status} paused={e.sales_paused} scheduled={!!e.publish_at} />
                    </div>
                    <p className="text-[12.5px] text-foreground-3">
                      {longDateTime(e.starts_at)} · {e.venue_name}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 px-4 pb-4">
                  <ProgressBar value={cap ? sold / cap : 0} />
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="text-foreground-3">
                      {sold} de {cap} vendidas
                    </span>
                    <span className="font-extrabold text-pink">{usd(revenue.get(e.id) ?? 0)}</span>
                  </div>
                  <div className="flex items-center gap-4 pt-1 text-[12.5px] font-bold">
                    <Link href={`/organizador/eventos/${e.id}`} className="text-foreground-2 hover:text-pink">
                      Analíticas
                    </Link>
                    {e.status !== "cancelled" && e.status !== "finished" && (
                      <Link href={`/organizador/eventos/${e.id}/editar`} className="text-foreground-2 hover:text-pink">
                        Editar
                      </Link>
                    )}
                    <form action={duplicateEventAction.bind(null, e.id)} className="ml-auto">
                      <button type="submit" className="text-foreground-3 hover:text-pink">
                        Duplicar
                      </button>
                    </form>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
