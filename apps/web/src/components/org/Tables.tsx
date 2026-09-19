"use client";

import { useMemo, useState, useTransition } from "react";
import { checkInAction } from "@/app/organizador/(panel)/actions";
import { Badge, Button, Table, Td, Th, Tr } from "@/components/ui";
import { downloadCsv } from "@/lib/csv";
import { usd } from "@/lib/format";
import { OrderStatusBadge } from "@/components/org/bits";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const searchClass = "w-full max-w-xs rounded-full border border-border-strong bg-surface px-4 py-2 text-[13px] outline-none placeholder:text-foreground-4 focus:border-pink";

export interface AttendeeItem {
  ticket_id: string;
  code: string;
  attendee_name: string;
  ticket_type_name: string;
  status: string;
  checked_in_at: string | null;
  total_usd_cents: number;
}

export function AttendeesTable({ eventId, eventTitle, attendees }: { eventId: string; eventTitle: string; attendees: AttendeeItem[] }) {
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const rows = useMemo(() => {
    const s = norm(q);
    return s ? attendees.filter((a) => norm(`${a.attendee_name} ${a.code} ${a.ticket_type_name}`).includes(s)) : attendees;
  }, [q, attendees]);

  const statusBadge = (s: string) =>
    s === "used" ? <Badge tone="success">Dentro</Badge> : s === "valid" ? <Badge tone="pink">Pagado</Badge> : <Badge tone="neutral">{s === "void" ? "Anulado" : s}</Badge>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o código" className={searchClass} />
        <Button
          type="button"
          variant="ghost"
          disabled={attendees.length === 0}
          onClick={() =>
            downloadCsv(
              `asistentes-${eventTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`,
              attendees.map((a) => ({
                Nombre: a.attendee_name,
                Entrada: a.ticket_type_name,
                Código: a.code,
                Estado: a.status === "used" ? "Dentro" : a.status === "valid" ? "Pagado" : a.status,
                "Hora de ingreso": a.checked_in_at ? new Date(a.checked_in_at).toLocaleString("es-VE") : "",
              }))
            )
          }
        >
          Exportar CSV
        </Button>
      </div>
      <Table>
        <thead>
          <tr>
            <Th>Asistente</Th>
            <Th>Entrada</Th>
            <Th>Código</Th>
            <Th>Estado</Th>
            <Th className="text-right">Acción</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <Tr key={a.ticket_id}>
              <Td className="font-semibold text-foreground">{a.attendee_name}</Td>
              <Td>{a.ticket_type_name}</Td>
              <Td className="font-mono text-[12.5px]">{a.code}</Td>
              <Td>{statusBadge(a.status)}</Td>
              <Td className="text-right">
                {a.status === "valid" && (
                  <Button type="button" variant="ghost" disabled={pending} onClick={() => start(() => checkInAction(eventId, a.code))}>
                    Dar entrada
                  </Button>
                )}
                {a.status === "used" && a.checked_in_at && (
                  <span className="text-[12px] text-foreground-3">{new Date(a.checked_in_at).toLocaleTimeString("es-VE", { hour: "numeric", minute: "2-digit" })}</span>
                )}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      {rows.length === 0 && <p className="px-5 py-8 text-center text-[13px] text-foreground-3">{attendees.length === 0 ? "Aún no hay ventas." : "Nadie coincide con esa búsqueda."}</p>}
    </div>
  );
}

export interface SaleItem {
  id: string;
  date: string;
  event: string;
  ticket: string;
  quantity: number;
  gross: number;
  commission: number;
  net: number;
  status: string;
  currency: string | null;
}

export function SalesTable({ sales }: { sales: SaleItem[] }) {
  const [page, setPage] = useState(0);
  const PAGE = 25;
  const pages = Math.max(1, Math.ceil(sales.length / PAGE));
  const slice = sales.slice(page * PAGE, page * PAGE + PAGE);
  return (
    <div>
      <div className="flex items-center justify-between px-5 py-3">
        <p className="text-[12.5px] text-foreground-3">{sales.length} pedidos</p>
        <Button
          type="button"
          variant="ghost"
          disabled={sales.length === 0}
          onClick={() =>
            downloadCsv(
              "ventas.csv",
              sales.map((s) => ({
                Fecha: new Date(s.date).toLocaleString("es-VE"),
                Evento: s.event,
                Entrada: s.ticket,
                Cantidad: s.quantity,
                "Venta bruta USD": (s.gross / 100).toFixed(2),
                "Comisión Plann USD": (s.commission / 100).toFixed(2),
                "Neto USD": (s.net / 100).toFixed(2),
                Estado: s.status,
                "Pagó en": s.currency === "bs" ? "Bs" : s.currency === "usd" ? "USD" : "",
              }))
            )
          }
        >
          Exportar CSV
        </Button>
      </div>
      <Table>
        <thead>
          <tr>
            <Th>Fecha</Th>
            <Th>Evento</Th>
            <Th>Entrada</Th>
            <Th className="text-right">Bruto</Th>
            <Th className="text-right">Comisión</Th>
            <Th className="text-right">Neto</Th>
            <Th>Estado</Th>
          </tr>
        </thead>
        <tbody>
          {slice.map((s) => {
            const counted = s.status === "paid";
            return (
              <Tr key={s.id}>
                <Td>{new Date(s.date).toLocaleDateString("es-VE", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</Td>
                <Td className="max-w-[220px] truncate font-semibold text-foreground">{s.event}</Td>
                <Td>
                  {s.quantity} × {s.ticket}
                </Td>
                <Td className="text-right">{counted ? usd(s.gross) : "—"}</Td>
                <Td className="text-right">{counted ? usd(s.commission) : "—"}</Td>
                <Td className="text-right font-bold">{counted ? usd(s.net) : "—"}</Td>
                <Td>
                  <OrderStatusBadge status={s.status} />
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
      {sales.length === 0 && <p className="px-5 py-8 text-center text-[13px] text-foreground-3">No hay pedidos con estos filtros.</p>}
      {pages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 text-[12.5px] text-foreground-3">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="font-bold text-foreground-2 disabled:opacity-40">
            ← Anterior
          </button>
          <span>
            Página {page + 1} de {pages}
          </span>
          <button disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="font-bold text-foreground-2 disabled:opacity-40">
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
