"use client";

import { useMemo, useState } from "react";
import { auditLog } from "@/lib/mock-data";
import { Card, PageHeader, Table, Td, Th, Tr } from "@/components/ui";

export default function AuditoriaPage() {
  const actors = useMemo(() => Array.from(new Set(auditLog.map((a) => a.actor))), []);
  const [actor, setActor] = useState<string>("todos");

  const rows = auditLog.filter((a) => actor === "todos" || a.actor === actor);

  return (
    <div>
      <PageHeader title="Registro de auditoría" subtitle="Toda acción administrativa: quién, qué, cuándo. Inmutable." />

      <div className="mb-4 flex flex-wrap gap-1 rounded-full border border-border bg-surface p-1 w-fit">
        <button
          onClick={() => setActor("todos")}
          className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-colors ${actor === "todos" ? "bg-pink text-white" : "text-foreground-2 hover:bg-surface-muted"}`}
        >
          Todos
        </button>
        {actors.map((a) => (
          <button
            key={a}
            onClick={() => setActor(a)}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-colors ${actor === a ? "bg-pink text-white" : "text-foreground-2 hover:bg-surface-muted"}`}
          >
            {a}
          </button>
        ))}
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Fecha</Th>
              <Th>Quién</Th>
              <Th>Acción</Th>
              <Th>Objetivo</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <Tr key={a.id}>
                <Td>{new Date(a.createdAt).toLocaleString("es-VE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</Td>
                <Td className="font-semibold text-foreground">{a.actor}</Td>
                <Td>{a.action}</Td>
                <Td>{a.target}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
