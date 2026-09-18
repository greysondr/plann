"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Badge, Button, Card, CardHeader, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { centsToUsd } from "@/lib/mock-data";
import type { Buyer, Order } from "@/lib/types";

const TIER_LABEL: Record<string, string> = {
  explorador: "Explorador",
  frecuente: "Frecuente",
  insider: "Insider",
  elite: "Elite",
  black: "Black",
};
const ORDER_STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  pagada: "success",
  en_verificacion: "warning",
  pendiente_pago: "neutral",
  rechazada: "danger",
  expirada: "danger",
  cancelada: "danger",
};

export function BuyerDetail({ buyer, orders }: { buyer: Buyer; orders: Order[] }) {
  const [flagged, setFlagged] = useState(buyer.flagged);
  const [notes, setNotes] = useState(buyer.notes);
  const [noteText, setNoteText] = useState("");

  function addNote() {
    if (!noteText.trim()) return;
    setNotes((n) => [{ id: `note-${Date.now()}`, author: "Luis (soporte)", text: noteText.trim(), createdAt: new Date().toISOString() }, ...n]);
    setNoteText("");
  }

  return (
    <div>
      <Link href="/admin/usuarios" className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-foreground-3 hover:text-foreground">
        <ChevronLeft size={14} /> Usuarios
      </Link>
      <PageHeader
        title={buyer.name}
        subtitle={`${buyer.email} · ${buyer.phone} · ${buyer.documentId}`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone="pink">{TIER_LABEL[buyer.tier]}</Badge>
            {flagged ? <Badge tone="danger">Señalado</Badge> : <Badge tone="success">Normal</Badge>}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-[12.5px] font-bold uppercase tracking-wide text-foreground-3">Gasto total</p>
          <p className="mt-2 text-[24px] font-extrabold text-foreground">{centsToUsd(buyer.totalSpentCents)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[12.5px] font-bold uppercase tracking-wide text-foreground-3">Órdenes pagadas</p>
          <p className="mt-2 text-[24px] font-extrabold text-foreground">{buyer.paidOrdersCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[12.5px] font-bold uppercase tracking-wide text-foreground-3">Puntos Plann</p>
          <p className="mt-2 text-[24px] font-extrabold text-foreground">{buyer.pointsBalance}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[12.5px] font-bold uppercase tracking-wide text-foreground-3">Cliente desde</p>
          <p className="mt-2 text-[18px] font-extrabold text-foreground">{new Date(buyer.createdAt).toLocaleDateString("es-VE")}</p>
          <p className="mt-1 text-[12px] text-foreground-3">{buyer.city} · {buyer.devicesCount} dispositivo{buyer.devicesCount > 1 ? "s" : ""}</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader title="Historial de órdenes" />
          <Table>
            <thead>
              <tr>
                <Th>Orden</Th>
                <Th>Evento</Th>
                <Th>Estado</Th>
                <Th className="text-right">Total</Th>
                <Th>Fecha</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <Tr key={o.id}>
                  <Td className="font-mono text-[12px]">{o.id}</Td>
                  <Td className="max-w-[220px] truncate">{o.eventTitle}</Td>
                  <Td><Badge tone={ORDER_STATUS_TONE[o.status]}>{o.status.replace("_", " ")}</Badge></Td>
                  <Td className="text-right font-bold text-foreground">{centsToUsd(o.totalCents)}</Td>
                  <Td>{new Date(o.createdAt).toLocaleDateString("es-VE")}</Td>
                </Tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <Td className="py-6 text-center text-foreground-3">Todavía no ha comprado nada.</Td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-2 p-5">
            <p className="text-[13px] font-bold text-foreground">Acciones</p>
            <Button variant="ghost" className="w-full" onClick={() => alert("Se reenvió el último ticket por correo.")}>Reenviar último ticket</Button>
            <Button variant="ghost" className="w-full" onClick={() => alert("Se registró un ajuste de saldo (demo).")}>Ajustar saldo</Button>
            <Button variant={flagged ? "primary" : "danger"} className="w-full" onClick={() => setFlagged((f) => !f)}>
              {flagged ? "Quitar señalamiento" : "Bloquear / señalar"}
            </Button>
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
