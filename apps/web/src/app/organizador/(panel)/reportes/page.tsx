import { can, requireRole } from "@/lib/org/session";
import { loadEvents, loadOrders } from "@/lib/org/data";
import { dayKey, eventSettlements, isPaid } from "@/lib/org/analytics";
import { longDateTime, usd } from "@/lib/format";
import { Card, CardHeader, EmptyState, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { PrintButton } from "@/components/org/PrintButton";
import { ReportDownload } from "@/components/org/ReportDownload";
import Link from "next/link";
import clsx from "clsx";

export const dynamic = "force-dynamic";

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { organizer } = await requireRole(can.money);
  const { mes } = await searchParams;
  const events = await loadEvents(organizer.id);
  const orders = await loadOrders(events.map((e) => e.id));

  const paid = orders.filter(isPaid);
  const months = [...new Set(paid.map((o) => dayKey(o.paid_at ?? o.created_at).slice(0, 7)))].sort().reverse();
  const month = mes && months.includes(mes) ? mes : months[0];
  const label = month ? `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}` : "";
  const inMonth = month ? orders.filter((o) => dayKey(o.paid_at ?? o.created_at).slice(0, 7) === month && (isPaid(o) || o.status === "refund_pending" || o.status === "refunded")) : [];
  const settle = [...eventSettlements(inMonth).values()];
  const title = new Map(events.map((e) => [e.id, e.title]));
  const typeName = new Map(events.flatMap((e) => e.ticket_types.map((t) => [t.id, t.name] as const)));
  const totals = settle.reduce(
    (t, s) => ({ tickets: t.tickets + s.tickets, gross: t.gross + s.grossCents, disc: t.disc + s.discountCents, comm: t.comm + s.commissionCents, net: t.net + s.netCents, refunded: t.refunded + s.refundedCents }),
    { tickets: 0, gross: 0, disc: 0, comm: 0, net: 0, refunded: 0 }
  );

  const csvRows = inMonth.map((o) => ({
    Fecha: new Date(o.paid_at ?? o.created_at).toLocaleString("es-VE"),
    Evento: title.get(o.event_id) ?? "",
    Entrada: typeName.get(o.ticket_type_id) ?? "",
    Cantidad: o.quantity,
    "Precio de lista USD": (((o.subtotal_cents + (o.discount_cents ?? 0)) / 100)).toFixed(2),
    "Cupón USD": ((o.discount_cents ?? 0) / 100).toFixed(2),
    "Comisión Plann USD": (o.commission_cents / 100).toFixed(2),
    "Neto USD": (o.organizer_net_cents / 100).toFixed(2),
    Estado: o.status === "paid" ? "Pagada" : o.status === "refund_pending" ? "Por reembolsar" : "Reembolsada",
    "Pagó en": o.currency_paid === "bs" ? "Bs" : o.currency_paid === "usd" ? "USD" : "",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        subtitle="Resumen mensual para tu contabilidad. Descárgalo en Excel (CSV) o guárdalo como PDF."
        action={
          month ? (
            <div className="flex gap-2 print:hidden">
              <ReportDownload filename={`plann-ventas-${month}.csv`} rows={csvRows} />
              <PrintButton />
            </div>
          ) : undefined
        }
      />

      {months.length === 0 ? (
        <Card>
          <EmptyState title="Aún no hay ventas para reportar" />
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 print:hidden">
            {months.map((m) => (
              <Link key={m} href={`/organizador/reportes?mes=${m}`} className={clsx("rounded-full border px-4 py-1.5 text-[12.5px] font-bold capitalize", m === month ? "border-pink bg-pink text-white" : "border-border-strong text-foreground-2 hover:bg-surface-muted")}>
                {MONTHS[Number(m.slice(5, 7)) - 1]} {m.slice(0, 4)}
              </Link>
            ))}
          </div>

          <Card className="p-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="font-display text-[24px] leading-none text-foreground">plann</p>
                <p className="mt-1 text-[12.5px] text-foreground-3">Reporte de ventas · {organizer.name}</p>
              </div>
              <p className="text-[18px] font-extrabold capitalize text-foreground">{label}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {[
                ["Entradas", String(totals.tickets)],
                ["Bruto", usd(totals.gross)],
                ["Cupones", totals.disc ? `−${usd(totals.disc)}` : "—"],
                ["Comisión Plann", `−${usd(totals.comm)}`],
                ["Neto", usd(totals.net)],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-[11.5px] font-bold uppercase text-foreground-3">{k}</p>
                  <p className="mt-1 text-[20px] font-extrabold text-foreground">{v}</p>
                </div>
              ))}
            </div>
            {totals.refunded > 0 && <p className="mt-3 text-[12.5px] text-foreground-3">Reembolsos del mes (ya fuera del neto): {usd(totals.refunded)}</p>}
          </Card>

          <Card>
            <CardHeader title="Por evento" />
            <Table>
              <thead>
                <tr>
                  <Th>Evento</Th>
                  <Th className="text-right">Entradas</Th>
                  <Th className="text-right">Bruto</Th>
                  <Th className="text-right">Cupones</Th>
                  <Th className="text-right">Comisión</Th>
                  <Th className="text-right">Reembolsos</Th>
                  <Th className="text-right">Neto</Th>
                </tr>
              </thead>
              <tbody>
                {settle.map((s) => (
                  <Tr key={s.eventId}>
                    <Td className="font-semibold text-foreground">{title.get(s.eventId)}</Td>
                    <Td className="text-right">{s.tickets}</Td>
                    <Td className="text-right">{usd(s.grossCents)}</Td>
                    <Td className="text-right">{s.discountCents ? `−${usd(s.discountCents)}` : "—"}</Td>
                    <Td className="text-right">{usd(s.commissionCents)}</Td>
                    <Td className="text-right">{s.refundedCents ? usd(s.refundedCents) : "—"}</Td>
                    <Td className="text-right font-bold">{usd(s.netCents)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>

          <p className="hidden text-[11.5px] text-foreground-3 print:block">Generado el {longDateTime(new Date().toISOString())}. Montos en USD.</p>
        </>
      )}
    </div>
  );
}
