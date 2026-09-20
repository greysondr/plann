import { supabaseAdmin } from "@/lib/supabase-admin";
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { reviewPaymentAction } from "./actions";

export const dynamic = "force-dynamic";

const usd = (cents: number) => `$${(cents / 100).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const bs = (n: number | null) => (n == null ? "—" : `Bs ${n.toLocaleString("es-VE")}`);
const when = (iso: string) => new Date(iso).toLocaleString("es-VE", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const METHOD: Record<string, string> = { pago_movil: "Pago Móvil", transfer: "Transferencia", zelle: "Zelle", binance: "Binance" };
const inputClass = "rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-[12.5px] text-foreground outline-none placeholder:text-foreground-4 focus:border-pink";

interface PaymentRow {
  id: string;
  method: string;
  amount_cents: number;
  currency: string;
  reference: string;
  payer_phone: string | null;
  payer_document: string | null;
  payer_bank: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  orders: { id: string; user_id: string; quantity: number; total_usd_cents: number; total_bs: number | null; events: { title: string } | null; ticket_types: { name: string } | null } | null;
}

export default async function PagosPage() {
  const db = supabaseAdmin();
  const select =
    "id, method, amount_cents, currency, reference, payer_phone, payer_document, payer_bank, status, rejection_reason, created_at, reviewed_at, orders(id, user_id, quantity, total_usd_cents, total_bs, events(title), ticket_types(name))";
  const [queueRes, doneRes, accountsRes] = await Promise.all([
    db.from("payments").select(select).in("status", ["submitted", "matched"]).order("created_at"),
    db.from("payments").select(select).in("status", ["approved", "rejected"]).order("reviewed_at", { ascending: false }).limit(10),
    db.from("receiving_accounts").select("id, type, label, details, is_active").order("label"),
  ]);
  const queue = (queueRes.data ?? []) as unknown as PaymentRow[];
  const done = (doneRes.data ?? []) as unknown as PaymentRow[];
  const userIds = [...new Set([...queue, ...done].map((p) => p.orders?.user_id).filter(Boolean))] as string[];
  const { data: userRows } = userIds.length ? await db.from("users").select("id, email, full_name").in("id", userIds) : { data: [] as { id: string; email: string; full_name: string | null }[] };
  const buyer = new Map((userRows ?? []).map((u) => [u.id, u]));
  const now = Date.now();

  return (
    <div>
      <PageHeader title="Pagos y conciliación" subtitle="Compara la referencia y el monto con tu banco. Al aprobar, el comprador recibe sus entradas al instante." />

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader title="Cola de verificación manual" subtitle={`${queue.length} ${queue.length === 1 ? "pago" : "pagos"} por revisar`} />
          {queue.length === 0 ? (
            <EmptyState title="Nada por verificar" subtitle="Cuando un comprador envíe la referencia de su pago, aparece aquí." />
          ) : (
            <div className="divide-y divide-border">
              {queue.map((p) => {
                const u = p.orders ? buyer.get(p.orders.user_id) : undefined;
                const waiting = Math.round((now - new Date(p.created_at).getTime()) / 60000);
                return (
                  <div key={p.id} className="space-y-3 px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[14px] font-bold text-foreground">
                          {p.orders?.quantity}× {p.orders?.ticket_types?.name} · {p.orders?.events?.title}
                        </p>
                        <p className="text-[12.5px] text-foreground-3">
                          {u?.full_name ?? "Comprador"} · {u?.email} · hace {waiting} min
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[15px] font-extrabold text-foreground">{usd(p.orders?.total_usd_cents ?? p.amount_cents)}</p>
                        <p className="text-[12px] text-foreground-3">{bs(p.orders?.total_bs ?? null)}</p>
                      </div>
                    </div>
                    <div className="grid gap-x-6 gap-y-1 text-[12.5px] text-foreground-2 sm:grid-cols-2">
                      <span>
                        <b>Método:</b> {METHOD[p.method] ?? p.method}
                      </span>
                      <span>
                        <b>Referencia:</b> <span className="font-mono">{p.reference}</span>
                      </span>
                      {p.payer_bank && (
                        <span>
                          <b>Banco:</b> {p.payer_bank}
                        </span>
                      )}
                      {p.payer_phone && (
                        <span>
                          <b>Teléfono:</b> {p.payer_phone}
                        </span>
                      )}
                      {p.payer_document && (
                        <span>
                          <b>Cédula:</b> {p.payer_document}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <form action={reviewPaymentAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="decision" value="approved" />
                        <Button type="submit">Aprobar</Button>
                      </form>
                      <form action={reviewPaymentAction} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="decision" value="rejected" />
                        <input name="reason" required minLength={3} placeholder="Motivo del rechazo" className={inputClass} />
                        <Button type="submit" variant="ghost">
                          Rechazar
                        </Button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Cuentas receptoras" subtitle="Las que ven los compradores al pagar" />
            <div className="divide-y divide-border">
              {(accountsRes.data ?? []).map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-2 px-5 py-3">
                  <div>
                    <p className="text-[13px] font-bold text-foreground">{a.label}</p>
                    <p className="text-[12px] text-foreground-3">{typeof a.details === "string" ? a.details : Object.entries(a.details ?? {}).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>
                  </div>
                  <Badge tone={a.is_active ? "success" : "neutral"}>{a.is_active ? "Activa" : "Inactiva"}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Resueltos recientemente" />
            {done.length === 0 ? (
              <EmptyState title="Todavía nada" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Pago</Th>
                    <Th>Resultado</Th>
                  </tr>
                </thead>
                <tbody>
                  {done.map((p) => (
                    <Tr key={p.id}>
                      <Td>
                        <p className="text-[12.5px] font-semibold text-foreground">{p.orders?.events?.title}</p>
                        <p className="text-[11.5px] text-foreground-3">
                          {p.reference} · {p.reviewed_at ? when(p.reviewed_at) : ""}
                        </p>
                      </Td>
                      <Td>
                        <Badge tone={p.status === "approved" ? "success" : "danger"}>{p.status === "approved" ? "Aprobado" : "Rechazado"}</Badge>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
