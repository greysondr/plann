"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { centsToUsd, events, findOrganizer } from "@/lib/mock-data";
import { Badge, Card, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import type { EventStatus } from "@/lib/types";

const TABS: { key: EventStatus | "todos"; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "en_revision", label: "En revisión" },
  { key: "publicado", label: "Publicados" },
  { key: "borrador", label: "Borradores" },
  { key: "pausado", label: "Pausados" },
  { key: "cancelado", label: "Cancelados" },
];
const TONE: Record<EventStatus, "success" | "warning" | "danger" | "neutral"> = {
  publicado: "success",
  en_revision: "warning",
  borrador: "neutral",
  pausado: "warning",
  cancelado: "danger",
};

export default function EventosPage() {
  const [tab, setTab] = useState<EventStatus | "todos">("todos");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    return events
      .filter((e) => tab === "todos" || e.status === tab)
      .filter((e) => !query.trim() || e.title.toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a, b) => (a.status === "en_revision" ? -1 : b.status === "en_revision" ? 1 : (a.createdAt < b.createdAt ? 1 : -1)));
  }, [tab, query]);

  return (
    <div>
      <PageHeader title="Eventos y moderación" subtitle="Cola de revisión y catálogo completo de planes publicados en Plann." />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-full border border-border bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-colors ${
                tab === t.key ? "bg-pink text-white" : "text-foreground-2 hover:bg-surface-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por título…"
          className="w-64 rounded-full border border-border-strong bg-surface px-4 py-2 text-[13px] outline-none focus:border-pink"
        />
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Evento</Th>
              <Th>Organizador</Th>
              <Th>Categoría</Th>
              <Th>Ciudad</Th>
              <Th>Estado</Th>
              <Th className="text-right">Vendidos</Th>
              <Th className="text-right">Ingresos</Th>
              <Th>Fecha</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <Tr key={e.id}>
                <Td>
                  <Link href={`/admin/eventos/${e.id}`} className="font-bold text-foreground hover:text-pink">
                    {e.title}
                    {e.isFeatured && <span className="ml-1.5 text-[11px] text-pink">★ destacado</span>}
                  </Link>
                </Td>
                <Td>{findOrganizer(e.organizerId)?.name}</Td>
                <Td>{e.category}</Td>
                <Td>{e.city}</Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={TONE[e.status]}>{e.status.replace("_", " ")}</Badge>
                    {e.reportsCount > 0 && <Badge tone="danger">{e.reportsCount} reporte{e.reportsCount > 1 ? "s" : ""}</Badge>}
                  </div>
                </Td>
                <Td className="text-right">{e.sold}/{e.capacity}</Td>
                <Td className="text-right font-bold text-foreground">{centsToUsd(e.revenueCents)}</Td>
                <Td>{new Date(e.startsAt).toLocaleDateString("es-VE")}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
