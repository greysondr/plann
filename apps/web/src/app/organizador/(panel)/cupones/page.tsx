import { can, requireRole } from "@/lib/org/session";
import { loadCoupons, loadEvents } from "@/lib/org/data";
import { shortDate, usd } from "@/lib/format";
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { CouponForm } from "@/components/org/EventEngage";
import { deleteCouponAction, toggleCouponAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function CouponsPage() {
  const { organizer } = await requireRole(can.manage);
  const [coupons, events] = await Promise.all([loadCoupons(organizer.id), loadEvents(organizer.id)]);
  const title = new Map(events.map((e) => [e.id, e.title]));
  const open = events.filter((e) => !["cancelled", "finished"].includes(e.status));

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Cupones" subtitle="Descuentos para tus compradores. La comisión de Plann se calcula sobre lo que realmente pagan." />
      <Card>
        <CardHeader title="Crear cupón" />
        <div className="p-5">
          <CouponForm events={open.map((e) => ({ id: e.id, title: e.title }))} />
        </div>
      </Card>
      <Card>
        <CardHeader title="Tus cupones" />
        {coupons.length === 0 ? (
          <EmptyState title="Todavía no has creado cupones" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Código</Th>
                <Th>Descuento</Th>
                <Th>Aplica a</Th>
                <Th className="text-right">Usos</Th>
                <Th>Estado</Th>
                <Th className="text-right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <Tr key={c.id}>
                  <Td className="font-mono font-bold text-foreground">{c.code}</Td>
                  <Td>{c.discount_type === "percent" ? `${c.discount_value}%` : usd(c.discount_value)}</Td>
                  <Td className="max-w-[220px] truncate">{c.event_id ? title.get(c.event_id) ?? "Un evento" : "Todos mis eventos"}</Td>
                  <Td className="text-right">
                    {c.uses}
                    {c.max_uses ? ` de ${c.max_uses}` : ""}
                    {c.valid_until ? <span className="ml-1 text-[11.5px] text-foreground-3">· vence {shortDate(c.valid_until)}</span> : null}
                  </Td>
                  <Td>
                    <Badge tone={c.active ? "success" : "neutral"}>{c.active ? "Activo" : "Pausado"}</Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      <form action={toggleCouponAction.bind(null, c.id, !c.active)}>
                        <Button type="submit" variant="ghost">
                          {c.active ? "Pausar" : "Activar"}
                        </Button>
                      </form>
                      <form action={deleteCouponAction.bind(null, c.id)}>
                        <Button type="submit" variant="danger">
                          Eliminar
                        </Button>
                      </form>
                    </div>
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
