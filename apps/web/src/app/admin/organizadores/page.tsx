"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { centsToUsd, ordersForOrganizer, organizers } from "@/lib/mock-data";
import { Badge, Card, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import type { OrganizerVerification } from "@/lib/types";

const TABS: { key: OrganizerVerification | "todos"; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "pendiente", label: "Pendientes" },
  { key: "verificado", label: "Verificados" },
  { key: "rechazado", label: "Rechazados" },
  { key: "suspendido", label: "Suspendidos" },
];

const TONE: Record<OrganizerVerification, "success" | "warning" | "danger" | "neutral"> = {
  verificado: "success",
  pendiente: "warning",
  rechazado: "danger",
  suspendido: "danger",
};

export default function OrganizadoresPage() {
  const [tab, setTab] = useState<OrganizerVerification | "todos">("todos");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    return organizers
      .filter((o) => tab === "todos" || o.verification === tab)
      .filter((o) => !query.trim() || o.name.toLowerCase().includes(query.trim().toLowerCase()))
      .map((o) => {
        const paid = ordersForOrganizer(o.id).filter((ord) => ord.status === "pagada");
        const totalSalesCents = paid.reduce((s, ord) => s + ord.subtotalCents, 0);
        return { organizer: o, totalSalesCents, orderCount: paid.length };
      })
      .sort((a, b) => b.totalSalesCents - a.totalSalesCents);
  }, [tab, query]);

  return (
    <div>
      <PageHeader title="Organizadores" subtitle="Verificación, plan, ventas y salud de cada negocio en Plann." />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-border bg-surface p-1">
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
          placeholder="Buscar por nombre…"
          className="w-64 rounded-full border border-border-strong bg-surface px-4 py-2 text-[13px] outline-none focus:border-pink"
        />
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Organizador</Th>
              <Th>Ciudad</Th>
              <Th>Plan</Th>
              <Th>Verificación</Th>
              <Th className="text-right">Ventas totales</Th>
              <Th>Rating</Th>
              <Th>Reembolsos</Th>
              <Th>Reportes</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ organizer: o, totalSalesCents, orderCount }) => (
              <Tr key={o.id}>
                <Td>
                  <Link href={`/admin/organizadores/${o.id}`} className="font-bold text-foreground hover:text-pink">
                    {o.name}
                  </Link>
                </Td>
                <Td>{o.city}</Td>
                <Td className="capitalize">{o.plan}</Td>
                <Td>
                  <Badge tone={TONE[o.verification]}>{o.verification}</Badge>
                </Td>
                <Td className="text-right font-bold text-foreground">
                  {centsToUsd(totalSalesCents)}
                  <span className="ml-1 font-normal text-foreground-3">({orderCount})</span>
                </Td>
                <Td>{o.ratingAvg > 0 ? `${o.ratingAvg.toFixed(1)} ★ (${o.ratingCount})` : "—"}</Td>
                <Td>
                  <Badge tone={o.refundRatePct > 15 ? "danger" : "neutral"}>{o.refundRatePct}%</Badge>
                </Td>
                <Td>{o.reportsCount > 0 ? <Badge tone="warning">{o.reportsCount}</Badge> : "—"}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
