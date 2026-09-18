"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Badge, Button, Card, CardHeader, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { centsToUsd } from "@/lib/mock-data";
import type { EventItem, Order, Organizer, OrganizerVerification } from "@/lib/types";

const TONE: Record<OrganizerVerification, "success" | "warning" | "danger" | "neutral"> = {
  verificado: "success",
  pendiente: "warning",
  rechazado: "danger",
  suspendido: "danger",
};
const EVENT_STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
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

export function OrganizerDetail({ organizer, events, orders }: { organizer: Organizer; events: EventItem[]; orders: Order[] }) {
  const [status, setStatus] = useState(organizer.verification);
  const [notes, setNotes] = useState(organizer.notes);
  const [noteText, setNoteText] = useState("");

  function addNote() {
    if (!noteText.trim()) return;
    setNotes((n) => [{ id: `note-${Date.now()}`, author: "Grey (superadmin)", text: noteText.trim(), createdAt: new Date().toISOString() }, ...n]);
    setNoteText("");
  }

  return (
    <div>
      <Link href="/admin/organizadores" className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-foreground-3 hover:text-foreground">
        <ChevronLeft size={14} /> Organizadores
      </Link>
      <PageHeader
        title={organizer.name}
        subtitle={`${organizer.legalName} · ${organizer.documentId} · ${organizer.city}`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={TONE[status]}>{status}</Badge>
            <Badge tone="neutral" >Plan {organizer.plan}</Badge>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <p className="text-[12.5px] font-bold uppercase tracking-wide text-foreground-3">Saldo disponible</p>
          <p className="mt-2 text-[24px] font-extrabold text-foreground">{centsToUsd(organizer.balanceAvailableCents)}</p>
          <p className="mt-1 text-[12px] text-foreground-3">{centsToUsd(organizer.balancePendingCents)} en camino a liberarse</p>
        </Card>
        <Card className="p-5">
          <p className="text-[12.5px] font-bold uppercase tracking-wide text-foreground-3">Reputación</p>
          <p className="mt-2 text-[24px] font-extrabold text-foreground">{organizer.ratingAvg > 0 ? organizer.ratingAvg.toFixed(1) : "—"} ★</p>
          <p className="mt-1 text-[12px] text-foreground-3">{organizer.ratingCount} reseñas · {organizer.reportsCount} reportes</p>
        </Card>
        <Card className="p-5">
          <p className="text-[12.5px] font-bold uppercase tracking-wide text-foreground-3">Tasa de reembolso</p>
          <p className={`mt-2 text-[24px] font-extrabold ${organizer.refundRatePct > 15 ? "text-danger" : "text-foreground"}`}>{organizer.refundRatePct}%</p>
          <p className="mt-1 text-[12px] text-foreground-3">Contacto: {organizer.phone} · {organizer.email}</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Eventos" subtitle={`${events.length} en total`} />
            <Table>
              <thead>
                <tr>
                  <Th>Evento</Th>
                  <Th>Categoría</Th>
                  <Th>Estado</Th>
                  <Th className="text-right">Vendidos</Th>
                  <Th className="text-right">Ingresos</Th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <Tr key={e.id}>
                    <Td>
                      <Link href={`/admin/eventos/${e.id}`} className="font-semibold text-foreground hover:text-pink">
                        {e.title}
                      </Link>
                    </Td>
                    <Td>{e.category}</Td>
                    <Td>
                      <Badge tone={EVENT_STATUS_TONE[e.status]}>{e.status.replace("_", " ")}</Badge>
                    </Td>
                    <Td className="text-right">
                      {e.sold}/{e.capacity}
                    </Td>
                    <Td className="text-right font-bold text-foreground">{centsToUsd(e.revenueCents)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>

          <Card>
            <CardHeader title="Órdenes recientes" />
            <Table>
              <thead>
                <tr>
                  <Th>Orden</Th>
                  <Th>Evento</Th>
                  <Th>Estado</Th>
                  <Th className="text-right">Neto organizador</Th>
                  <Th>Fecha</Th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <Tr key={o.id}>
                    <Td className="font-mono text-[12px]">{o.id}</Td>
                    <Td className="max-w-[200px] truncate">{o.eventTitle}</Td>
                    <Td>
                      <Badge tone={ORDER_STATUS_TONE[o.status]}>{o.status.replace("_", " ")}</Badge>
                    </Td>
                    <Td className="text-right font-semibold text-foreground">{centsToUsd(o.organizerNetCents)}</Td>
                    <Td>{new Date(o.createdAt).toLocaleDateString("es-VE")}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="mb-3 text-[13px] font-bold text-foreground">Verificación KYC</p>
            <dl className="space-y-2 text-[12.5px]">
              <div className="flex justify-between"><dt className="text-foreground-3">Cédula/RIF</dt><dd className="font-semibold text-foreground">{organizer.documentId}</dd></div>
              <div className="flex justify-between"><dt className="text-foreground-3">Razón social</dt><dd className="font-semibold text-foreground">{organizer.legalName}</dd></div>
              <div className="flex justify-between"><dt className="text-foreground-3">Creado</dt><dd className="font-semibold text-foreground">{new Date(organizer.createdAt).toLocaleDateString("es-VE")}</dd></div>
            </dl>
            <div className="mt-4 flex flex-col gap-2">
              {status !== "verificado" && (
                <Button onClick={() => setStatus("verificado")}>Aprobar verificación</Button>
              )}
              {status !== "rechazado" && status !== "verificado" && (
                <Button variant="danger" onClick={() => setStatus("rechazado")}>Rechazar</Button>
              )}
              {status === "verificado" && (
                <Button variant="danger" onClick={() => setStatus("suspendido")}>Suspender</Button>
              )}
              {status === "suspendido" && <Button onClick={() => setStatus("verificado")}>Reactivar</Button>}
            </div>
          </Card>

          <Card className="p-5">
            <p className="mb-3 text-[13px] font-bold text-foreground">Notas internas</p>
            <div className="mb-3 flex gap-2">
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Agregar una nota…"
                className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-[12.5px] outline-none focus:border-pink"
              />
              <Button className="!px-3" onClick={addNote}>Agregar</Button>
            </div>
            <div className="space-y-3">
              {notes.length === 0 && <p className="text-[12px] text-foreground-3">Sin notas todavía.</p>}
              {notes.map((n) => (
                <div key={n.id} className="rounded-lg bg-surface-muted p-3">
                  <p className="text-[12.5px] text-foreground-2">{n.text}</p>
                  <p className="mt-1 text-[11px] text-foreground-3">{n.author} · {new Date(n.createdAt).toLocaleDateString("es-VE")}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
