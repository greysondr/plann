"use client";

import { Download } from "lucide-react";
import { Button, Card, PageHeader } from "@/components/ui";
import { downloadCsv } from "@/lib/csv";
import { events, findEvent, findOrganizer, organizers, orders } from "@/lib/mock-data";

function centsToNumber(c: number) {
  return Math.round(c) / 100;
}

const REPORTS = [
  {
    title: "Ventas por periodo",
    subtitle: "Todas las órdenes con su estado, monto y método de pago.",
    run: () =>
      orders.map((o) => ({
        orden: o.id,
        fecha: o.createdAt.slice(0, 10),
        evento: o.eventTitle,
        organizador: findOrganizer(o.organizerId)?.name ?? "",
        estado: o.status,
        metodo: o.method,
        cantidad: o.quantity,
        subtotal_usd: centsToNumber(o.subtotalCents),
        fee_usd: centsToNumber(o.feeCents),
        total_usd: centsToNumber(o.totalCents),
      })),
    filename: "ventas-por-periodo.csv",
  },
  {
    title: "Ventas por organizador",
    subtitle: "Totales agregados por organizador, solo órdenes pagadas.",
    run: () =>
      organizers.map((o) => {
        const paid = orders.filter((ord) => ord.organizerId === o.id && ord.status === "pagada");
        return {
          organizador: o.name,
          plan: o.plan,
          verificacion: o.verification,
          ordenes_pagadas: paid.length,
          gmv_usd: centsToNumber(paid.reduce((s, ord) => s + ord.subtotalCents, 0)),
          comision_plann_usd: centsToNumber(paid.reduce((s, ord) => s + ord.commissionCents, 0)),
          neto_organizador_usd: centsToNumber(paid.reduce((s, ord) => s + ord.organizerNetCents, 0)),
        };
      }),
    filename: "ventas-por-organizador.csv",
  },
  {
    title: "Ventas por evento",
    subtitle: "Capacidad, vendidos e ingresos de cada evento.",
    run: () =>
      events.map((e) => ({
        evento: e.title,
        organizador: findOrganizer(e.organizerId)?.name ?? "",
        categoria: e.category,
        ciudad: e.city,
        estado: e.status,
        capacidad: e.capacity,
        vendidos: e.sold,
        ingresos_usd: centsToNumber(e.revenueCents),
      })),
    filename: "ventas-por-evento.csv",
  },
  {
    title: "Ingresos de Plann",
    subtitle: "Comisiones y fees cobrados, orden por orden (solo pagadas).",
    run: () =>
      orders
        .filter((o) => o.status === "pagada")
        .map((o) => ({
          orden: o.id,
          fecha: o.createdAt.slice(0, 10),
          evento: findEvent(o.eventId)?.title ?? o.eventTitle,
          comision_usd: centsToNumber(o.commissionCents),
          fee_servicio_usd: centsToNumber(o.feeCents),
          total_ingreso_plann_usd: centsToNumber(o.commissionCents + o.feeCents),
        })),
    filename: "ingresos-plann.csv",
  },
  {
    title: "Pasivo con organizadores",
    subtitle: "Cuánto le debe Plann a cada organizador ahora mismo.",
    run: () =>
      organizers
        .filter((o) => o.balanceAvailableCents + o.balancePendingCents > 0)
        .map((o) => ({
          organizador: o.name,
          saldo_disponible_usd: centsToNumber(o.balanceAvailableCents),
          saldo_pendiente_usd: centsToNumber(o.balancePendingCents),
          total_usd: centsToNumber(o.balanceAvailableCents + o.balancePendingCents),
        })),
    filename: "pasivo-organizadores.csv",
  },
  {
    title: "Reembolsos y cancelaciones",
    subtitle: "Órdenes rechazadas, expiradas o canceladas.",
    run: () =>
      orders
        .filter((o) => o.status === "rechazada" || o.status === "expirada" || o.status === "cancelada")
        .map((o) => ({
          orden: o.id,
          fecha: o.createdAt.slice(0, 10),
          evento: o.eventTitle,
          estado: o.status,
          total_usd: centsToNumber(o.totalCents),
        })),
    filename: "reembolsos-cancelaciones.csv",
  },
];

export default function ReportesPage() {
  return (
    <div>
      <PageHeader title="Reportes" subtitle="Exporta cualquiera de estos reportes en CSV, listos para Excel o el contador." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((r) => (
          <Card key={r.filename} className="flex flex-col p-5">
            <p className="text-[14px] font-bold text-foreground">{r.title}</p>
            <p className="mt-1 flex-1 text-[12.5px] text-foreground-3">{r.subtitle}</p>
            <Button className="mt-4 w-full" onClick={() => downloadCsv(r.filename, r.run())}>
              <Download size={14} /> Descargar CSV
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
