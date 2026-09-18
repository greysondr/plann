"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Badge, Button, Card, CardHeader, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { centsToUsd } from "@/lib/mock-data";
import type { EventItem, EventStatus, Order } from "@/lib/types";

const TONE: Record<EventStatus, "success" | "warning" | "danger" | "neutral"> = {
  publicado: "success",
  en_revision: "warning",
  borrador: "neutral",
  pausado: "warning",
  cancelado: "danger",
};
const ORDER_STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  pagada: "success",
  en_verificacion: "warning",
  pendiente_pago: "neutral",
  rechazada: "danger",
  expirada: "danger",
  cancelada: "danger",
};

export function EventDetail({ event, organizerName, orders }: { event: EventItem; organizerName: string; orders: Order[] }) {
  const [status, setStatus] = useState(event.status);
  const [featured, setFeatured] = useState(event.isFeatured);
  const pct = Math.round((event.sold / event.capacity) * 100);

  return (
    <div>
      <Link href="/admin/eventos" className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-foreground-3 hover:text-foreground">
        <ChevronLeft size={14} /> Eventos
      </Link>
      <PageHeader
        title={event.title}
        subtitle={`${organizerName} · ${event.category} · ${event.city}`}
        action={<Badge tone={TONE[status]}>{status.replace("_", " ")}</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-[12.5px] font-bold uppercase tracking-wide text-foreground-3">Vendidos</p>
          <p className="mt-2 text-[24px] font-extrabold text-foreground">{event.sold}/{event.capacity}</p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full rounded-full bg-pink" style={{ width: `${pct}%` }} />
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-[12.5px] font-bold uppercase tracking-wide text-foreground-3">Ingresos</p>
          <p className="mt-2 text-[24px] font-extrabold text-foreground">{centsToUsd(event.revenueCents)}</p>
          <p className="mt-1 text-[12px] text-foreground-3">Desde {centsToUsd(event.priceFromCents)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[12.5px] font-bold uppercase tracking-wide text-foreground-3">Rating</p>
          <p className="mt-2 text-[24px] font-extrabold text-foreground">{event.ratingAvg > 0 ? event.ratingAvg.toFixed(1) : "—"} ★</p>
          <p className="mt-1 text-[12px] text-foreground-3">{event.reportsCount} reporte{event.reportsCount === 1 ? "" : "s"}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[12.5px] font-bold uppercase tracking-wide text-foreground-3">Fecha</p>
          <p className="mt-2 text-[18px] font-extrabold text-foreground">{new Date(event.startsAt).toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" })}</p>
          <p className="mt-1 text-[12px] text-foreground-3">Publicado el {new Date(event.createdAt).toLocaleDateString("es-VE")}</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardHeader title="Órdenes de este evento" />
          <Table>
            <thead>
              <tr>
                <Th>Orden</Th>
                <Th>Estado</Th>
                <Th className="text-right">Cantidad</Th>
                <Th className="text-right">Total</Th>
                <Th>Fecha</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <Tr key={o.id}>
                  <Td className="font-mono text-[12px]">{o.id}</Td>
                  <Td><Badge tone={ORDER_STATUS_TONE[o.status]}>{o.status.replace("_", " ")}</Badge></Td>
                  <Td className="text-right">{o.quantity}</Td>
                  <Td className="text-right font-bold text-foreground">{centsToUsd(o.totalCents)}</Td>
                  <Td>{new Date(o.createdAt).toLocaleDateString("es-VE")}</Td>
                </Tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <Td className="py-6 text-center text-foreground-3" >
                    Sin órdenes todavía.
                  </Td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>

        <Card className="space-y-3 p-5">
          <p className="text-[13px] font-bold text-foreground">Moderación</p>
          {status === "en_revision" && (
            <>
              <Button className="w-full" onClick={() => setStatus("publicado")}>Aprobar y publicar</Button>
              <Button variant="ghost" className="w-full" onClick={() => alert("Se notificó al organizador para que corrija el evento.")}>Pedir cambios</Button>
              <Button variant="danger" className="w-full" onClick={() => setStatus("cancelado")}>Rechazar</Button>
            </>
          )}
          {status === "publicado" && (
            <>
              <Button variant="ghost" className="w-full" onClick={() => setStatus("pausado")}>Pausar ventas</Button>
              <Button variant="danger" className="w-full" onClick={() => setStatus("cancelado")}>Cancelar (reembolso masivo)</Button>
              <Button variant="ghost" className="w-full" onClick={() => setFeatured((f) => !f)}>
                {featured ? "Quitar destacado" : "Poner como destacado"}
              </Button>
            </>
          )}
          {status === "pausado" && <Button className="w-full" onClick={() => setStatus("publicado")}>Reanudar ventas</Button>}
          {status === "cancelado" && <p className="text-[12.5px] text-foreground-3">Este evento está cancelado. Los reembolsos se procesan automáticamente.</p>}
          {status === "borrador" && <p className="text-[12.5px] text-foreground-3">El organizador todavía no lo ha enviado a revisión.</p>}
          {featured && <Badge tone="pink">★ Destacado manual activo</Badge>}
        </Card>
      </div>
    </div>
  );
}
