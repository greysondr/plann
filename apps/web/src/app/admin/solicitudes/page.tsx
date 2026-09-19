import { supabaseAdmin } from "@/lib/supabase-admin";
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { markRefunded, resolveWithdrawal, reviewOrganizer } from "./actions";

export const dynamic = "force-dynamic";

const usd = (cents: number) => `$${(cents / 100).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (iso: string) => new Date(iso).toLocaleDateString("es-VE", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const METHOD: Record<string, string> = { pago_movil: "Pago Móvil", transfer: "Transferencia", zelle: "Zelle" };

export default async function SolicitudesPage() {
  const db = supabaseAdmin();
  const [orgs, wds, refunds] = await Promise.all([
    db
      .from("organizers")
      .select("id, name, legal_document, verification_status, rejection_reason, created_at, owner_user_id")
      .in("verification_status", ["pendiente", "rechazado", "suspendido"])
      .order("created_at", { ascending: false }),
    db
      .from("withdrawals")
      .select("id, amount_cents, method, reference, status, requested_at, organizers(name)")
      .order("requested_at", { ascending: false })
      .limit(30),
    db
      .from("orders")
      .select("id, total_usd_cents, updated_at, user_id, events(title)")
      .eq("status", "refund_pending")
      .order("updated_at", { ascending: false }),
  ]);

  const orgRows = (orgs.data ?? []) as any[];
  const refundRows = (refunds.data ?? []) as any[];
  const userIds = [...new Set([...orgRows.map((o) => o.owner_user_id), ...refundRows.map((r) => r.user_id)])];
  const { data: userRows } = userIds.length
    ? await db.from("users").select("id, email, full_name").in("id", userIds)
    : { data: [] as any[] };
  const userById = new Map((userRows ?? []).map((u: any) => [u.id, u]));
  const organizers = orgRows.map((o) => ({ ...o, owner: userById.get(o.owner_user_id) }));
  const withdrawals = (wds.data ?? []) as any[];
  const refundOrders = refundRows.map((r) => ({ ...r, buyer: userById.get(r.user_id) }));
  const pendingOrgs = organizers.filter((o) => o.verification_status === "pendiente");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitudes"
        subtitle="Verificación de organizadores, retiros y reembolsos por cancelación. Datos reales de Supabase."
      />

      <Card>
        <CardHeader title="Verificación de organizadores" subtitle={`${pendingOrgs.length} por revisar`} />
        {organizers.length === 0 ? (
          <EmptyState title="Sin solicitudes" subtitle="Cuando alguien pida ser organizador aparece aquí." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Organizador</Th>
                <Th>Cédula o RIF</Th>
                <Th>Cuenta</Th>
                <Th>Estado</Th>
                <Th className="text-right">Decisión</Th>
              </tr>
            </thead>
            <tbody>
              {organizers.map((o) => (
                <Tr key={o.id}>
                  <Td>
                    <div className="font-semibold text-foreground">{o.name}</div>
                    <div className="text-[12px] text-foreground-3">{date(o.created_at)}</div>
                  </Td>
                  <Td>{o.legal_document ?? "—"}</Td>
                  <Td>
                    <div>{o.owner?.full_name ?? "—"}</div>
                    <div className="text-[12px] text-foreground-3">{o.owner?.email}</div>
                  </Td>
                  <Td>
                    <Badge tone={o.verification_status === "pendiente" ? "warning" : "danger"}>{o.verification_status}</Badge>
                    {o.rejection_reason && <div className="mt-1 text-[12px] text-foreground-3">{o.rejection_reason}</div>}
                  </Td>
                  <Td className="text-right">
                    {o.verification_status === "pendiente" && (
                      <div className="flex flex-col items-end gap-2">
                        <form action={reviewOrganizer}>
                          <input type="hidden" name="id" value={o.id} />
                          <input type="hidden" name="decision" value="verificado" />
                          <Button type="submit">Aprobar</Button>
                        </form>
                        <form action={reviewOrganizer} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={o.id} />
                          <input type="hidden" name="decision" value="rechazado" />
                          <input
                            name="reason"
                            required
                            minLength={5}
                            placeholder="Motivo del rechazo"
                            className="w-44 rounded-full border border-border-strong bg-surface px-3 py-1.5 text-[12.5px]"
                          />
                          <Button type="submit" variant="danger">Rechazar</Button>
                        </form>
                      </div>
                    )}
                    {o.verification_status === "rechazado" && (
                      <form action={reviewOrganizer}>
                        <input type="hidden" name="id" value={o.id} />
                        <input type="hidden" name="decision" value="verificado" />
                        <Button type="submit" variant="ghost">Aprobar de todos modos</Button>
                      </form>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader title="Retiros" subtitle="Marca como pagado cuando hayas hecho la transferencia." />
        {withdrawals.length === 0 ? (
          <EmptyState title="Sin retiros" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Organizador</Th>
                <Th>Cuenta de destino</Th>
                <Th className="text-right">Monto</Th>
                <Th>Estado</Th>
                <Th className="text-right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((w) => (
                <Tr key={w.id}>
                  <Td>
                    <div className="font-semibold text-foreground">{w.organizers?.name}</div>
                    <div className="text-[12px] text-foreground-3">{date(w.requested_at)}</div>
                  </Td>
                  <Td>
                    <div>{METHOD[w.method] ?? w.method}</div>
                    <div className="text-[12px] text-foreground-3">{w.reference}</div>
                  </Td>
                  <Td className="text-right font-bold">{usd(w.amount_cents)}</Td>
                  <Td>
                    <Badge tone={w.status === "pagado" ? "success" : w.status === "rechazado" ? "danger" : "warning"}>{w.status}</Badge>
                  </Td>
                  <Td className="text-right">
                    {w.status === "pendiente" && (
                      <div className="flex justify-end gap-2">
                        <form action={resolveWithdrawal}>
                          <input type="hidden" name="id" value={w.id} />
                          <input type="hidden" name="status" value="pagado" />
                          <Button type="submit">Marcar pagado</Button>
                        </form>
                        <form action={resolveWithdrawal}>
                          <input type="hidden" name="id" value={w.id} />
                          <input type="hidden" name="status" value="rechazado" />
                          <Button type="submit" variant="danger">Rechazar</Button>
                        </form>
                      </div>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader title="Reembolsos por cancelación" subtitle="Eventos cancelados con pagos que hay que devolver al comprador." />
        {refundOrders.length === 0 ? (
          <EmptyState title="Sin reembolsos pendientes" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Evento</Th>
                <Th>Comprador</Th>
                <Th className="text-right">Monto</Th>
                <Th className="text-right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {refundOrders.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-semibold text-foreground">{r.events?.title}</Td>
                  <Td>{r.buyer?.email}</Td>
                  <Td className="text-right font-bold">{usd(r.total_usd_cents)}</Td>
                  <Td className="text-right">
                    <form action={markRefunded}>
                      <input type="hidden" name="id" value={r.id} />
                      <Button type="submit">Marcar reembolsado</Button>
                    </form>
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
