"use client";

import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { bcvHistory, centsToUsd, findEvent, paymentQueue } from "@/lib/mock-data";
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import type { Order } from "@/lib/types";

const RECEIVING_ACCOUNTS = [
  { label: "Pago móvil — Banesco", detail: "0134 · 0414-1234567 · J-403123456", active: true },
  { label: "Pago móvil — Mercantil", detail: "0105 · 0424-7654321 · J-403123456", active: false },
  { label: "Zelle", detail: "pagos@plann.app", active: true },
  { label: "Binance Pay", detail: "ID 208491023", active: false },
];

export default function PagosPage() {
  const [queue, setQueue] = useState<Order[]>(() => paymentQueue());
  const [resolved, setResolved] = useState<{ order: Order; result: "aprobado" | "rechazado" }[]>([]);
  const latest = bcvHistory[bcvHistory.length - 1];

  function resolve(order: Order, result: "aprobado" | "rechazado") {
    setQueue((q) => q.filter((o) => o.id !== order.id));
    setResolved((r) => [{ order, result }, ...r].slice(0, 6));
  }

  const avgWait = useMemo(() => (queue.length ? Math.round(queue.reduce((s, o) => s + (o.waitingMinutes ?? 0), 0) / queue.length) : 0), [queue]);

  return (
    <div>
      <PageHeader
        title="Pagos y conciliación"
        subtitle="Cola de verificación manual — meta: menos de 15 minutos de espera (sección 4.2)."
      />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader
            title="Cola de verificación manual"
            subtitle={`${queue.length} en cola · espera promedio ${avgWait} min`}
          />
          {queue.length === 0 ? (
            <EmptyState title="No hay pagos esperando verificación" subtitle="La cola está al día." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Orden</Th>
                  <Th>Evento</Th>
                  <Th>Método</Th>
                  <Th>Referencia</Th>
                  <Th className="text-right">Monto</Th>
                  <Th>Espera</Th>
                  <Th className="text-right">Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {queue.map((o) => {
                  const event = findEvent(o.eventId);
                  return (
                    <Tr key={o.id}>
                      <Td className="font-mono text-[12px]">{o.id}</Td>
                      <Td className="max-w-[220px] truncate font-semibold text-foreground">{event?.title ?? o.eventTitle}</Td>
                      <Td>{o.method === "pago_movil" ? `Pago móvil${o.bank ? ` · ${o.bank}` : ""}` : o.method === "transferencia" ? `Transferencia${o.bank ? ` · ${o.bank}` : ""}` : "Zelle"}</Td>
                      <Td className="font-mono text-[12px]">{o.reference}</Td>
                      <Td className="text-right font-bold text-foreground">{centsToUsd(o.totalCents)}</Td>
                      <Td>
                        <Badge tone={(o.waitingMinutes ?? 0) > 15 ? "danger" : "neutral"}>{o.waitingMinutes} min</Badge>
                      </Td>
                      <Td>
                        <div className="flex justify-end gap-1.5">
                          <Button variant="primary" className="!px-3 !py-1.5" onClick={() => resolve(o, "aprobado")}>
                            <Check size={13} /> Aprobar
                          </Button>
                          <Button variant="danger" className="!px-3 !py-1.5" onClick={() => resolve(o, "rechazado")}>
                            <X size={13} /> Rechazar
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
          {resolved.length > 0 && (
            <div className="border-t border-border px-5 py-4">
              <p className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-foreground-3">Resueltos en esta sesión</p>
              <div className="flex flex-wrap gap-2">
                {resolved.map((r) => (
                  <Badge key={r.order.id} tone={r.result === "aprobado" ? "success" : "danger"}>
                    {r.order.id} · {r.result}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-[12.5px] font-bold uppercase tracking-wide text-foreground-3">Tasa BCV de hoy</p>
            <p className="mt-2 text-[26px] font-extrabold text-foreground">Bs. {latest.rateBcv.toFixed(2)}</p>
            <p className="mt-1 text-[12px] text-foreground-3">Margen Plann +{latest.marginPct}% → tasa aplicada Bs. {latest.rateApplied.toFixed(2)}</p>
            <div className="mt-4 flex h-16 items-end gap-1">
              {bcvHistory.map((p) => (
                <div key={p.date} className="flex-1 rounded-t bg-pink-soft" style={{ height: `${(p.rateBcv / bcvHistory[bcvHistory.length - 1].rateBcv) * 100}%` }} title={`${p.date}: Bs. ${p.rateBcv}`} />
              ))}
            </div>
            <p className="mt-2 text-[11px] text-foreground-4">Historial de 14 días</p>
          </Card>

          <Card>
            <CardHeader title="Cuentas receptoras" subtitle="Rotación de cuentas mostradas en la app" />
            <div className="divide-y divide-border">
              {RECEIVING_ACCOUNTS.map((a) => (
                <div key={a.label} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-[13px] font-bold text-foreground">{a.label}</p>
                    <p className="text-[11.5px] text-foreground-3">{a.detail}</p>
                  </div>
                  {a.active ? <Badge tone="success">Activa</Badge> : <Badge tone="neutral">En reserva</Badge>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
