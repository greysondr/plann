import { can, requireRole } from "@/lib/org/session";
import { loadBalance, loadEvents, loadOrders, loadWithdrawals, pendingRelease } from "@/lib/org/data";
import { currencySplit, eventSettlements, monthlySummary } from "@/lib/org/analytics";
import { shortDate, usd } from "@/lib/format";
import { Badge, Card, CardHeader, EmptyState, PageHeader, StatCard, Table, Td, Th, Tr } from "@/components/ui";
import { WithdrawForm } from "@/components/org/SimpleForms";
import { Donut } from "@/components/org/charts";
import Link from "next/link";

export const dynamic = "force-dynamic";

const METHOD: Record<string, string> = { pago_movil: "Pago Móvil", transfer: "Transferencia", zelle: "Zelle" };

export default async function FinancesPage() {
  const { organizer, role } = await requireRole(can.money);
  const events = await loadEvents(organizer.id);
  const [balance, withdrawals, orders] = await Promise.all([loadBalance(organizer.id), loadWithdrawals(organizer.id), loadOrders(events.map((e) => e.id))]);
  const months = monthlySummary(orders);
  const split = currencySplit(orders);
  const settlements = eventSettlements(orders);
  const PLAN_NAME: Record<string, string> = { basico: "Básico", pro: "Pro", business: "Business" };
  const RELEASE: Record<string, string> = {
    basico: "3 días después de que termina cada evento",
    pro: "3 días después de cada venta",
    business: "24 horas después de cada venta",
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Finanzas" subtitle="Tu saldo, tus retiros y cuánto te queda de cada venta." />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <StatCard label="Disponible para retirar" value={usd(balance.balance_available_cents)} />
        <StatCard label="Por liberar" value={usd(pendingRelease(balance))} hint={`Plan ${PLAN_NAME[organizer.plan]}: ${RELEASE[organizer.plan]}`} />
        <StatCard label="En proceso de pago" value={usd(balance.pending_withdrawal_cents)} hint="retiros solicitados" />
        <StatCard label="Ya retirado" value={usd(balance.withdrawn_cents)} />
        <StatCard label="Por reembolsar" value={usd(balance.refund_pending_cents)} hint="ya descontado de tu saldo" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Solicitar retiro" subtitle="Te pagamos en 1 a 2 días hábiles. Mínimo $5,00." />
          <div className="p-5">
            <WithdrawForm available={balance.balance_available_cents} method={organizer.payout_method} account={organizer.payout_account} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Cómo pagan tus compradores" subtitle="Por monto cobrado" />
          <div className="p-5">
            {split.usd + split.bs === 0 ? (
              <EmptyState title="Sin ventas todavía" />
            ) : (
              <Donut
                data={[
                  { name: "Dólares (Zelle)", value: split.usd / 100 },
                  { name: "Bolívares (Pago Móvil / transferencia)", value: split.bs / 100 },
                ]}
              />
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Liquidación por evento" subtitle="Bruto a precio de lista, descuentos, comisión de Plann, reembolsos y lo que te queda" />
        {settlements.size === 0 ? (
          <EmptyState title="Sin ventas todavía" />
        ) : (
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
              {events.filter((e) => settlements.has(e.id)).map((e) => {
                const s = settlements.get(e.id)!;
                return (
                  <Tr key={e.id}>
                    <Td className="max-w-[240px] truncate font-semibold text-foreground">{e.title}</Td>
                    <Td className="text-right">{s.tickets}</Td>
                    <Td className="text-right">{usd(s.grossCents)}</Td>
                    <Td className="text-right">{s.discountCents ? `−${usd(s.discountCents)}` : "—"}</Td>
                    <Td className="text-right">{usd(s.commissionCents)}</Td>
                    <Td className="text-right">{s.refundedCents ? `${usd(s.refundedCents)} (${s.refundedOrders})` : "—"}</Td>
                    <Td className="text-right font-bold">{usd(s.netCents)}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader title="Resumen por mes" subtitle="Ventas pagadas, comisión de Plann y lo que te queda" />
        {months.length === 0 ? (
          <EmptyState title="Sin ventas todavía" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Mes</Th>
                <Th className="text-right">Entradas</Th>
                <Th className="text-right">Venta bruta</Th>
                <Th className="text-right">Comisión Plann</Th>
                <Th className="text-right">Neto para ti</Th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <Tr key={m.month}>
                  <Td className="font-semibold capitalize text-foreground">{m.label}</Td>
                  <Td className="text-right">{m.tickets}</Td>
                  <Td className="text-right">{usd(m.grossCents)}</Td>
                  <Td className="text-right">{usd(m.commissionCents)}</Td>
                  <Td className="text-right font-bold">{usd(m.netCents)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader title="Historial de retiros" />
        {withdrawals.length === 0 ? (
          <EmptyState title="Todavía no has pedido ningún retiro" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Método</Th>
                <Th>Cuenta</Th>
                <Th className="text-right">Monto</Th>
                <Th>Estado</Th>
                <Th className="text-right">Comprobante</Th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((w) => (
                <Tr key={w.id}>
                  <Td>{shortDate(w.requested_at)}</Td>
                  <Td>{METHOD[w.method] ?? w.method}</Td>
                  <Td className="max-w-[260px] truncate">{w.reference}</Td>
                  <Td className="text-right font-bold">{usd(w.amount_cents)}</Td>
                  <Td>
                    <Badge tone={w.status === "pagado" ? "success" : w.status === "rechazado" ? "danger" : "warning"}>
                      {w.status === "pagado" ? "Pagado" : w.status === "rechazado" ? "Rechazado" : "En proceso"}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <Link href={`/organizador/finanzas/retiro/${w.id}`} className="text-[12.5px] font-bold text-pink">
                      Ver
                    </Link>
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
