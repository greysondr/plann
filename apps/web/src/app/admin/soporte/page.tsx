"use client";

import { useState } from "react";
import { supportTickets as seed } from "@/lib/mock-data";
import { Badge, Card, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import type { SupportTicket } from "@/lib/types";

const STATUS_TONE: Record<SupportTicket["status"], "success" | "warning" | "neutral"> = {
  abierto: "warning",
  en_progreso: "neutral",
  resuelto: "success",
};
const PRIORITY_TONE: Record<SupportTicket["priority"], "danger" | "warning" | "neutral"> = {
  alta: "danger",
  media: "warning",
  baja: "neutral",
};

export default function SoportePage() {
  const [tickets] = useState<SupportTicket[]>(seed);
  const open = tickets.filter((t) => t.status !== "resuelto").length;

  return (
    <div>
      <PageHeader title="Soporte" subtitle={`Bandeja de tickets de ayuda — ${open} abiertos.`} />
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Comprador</Th>
              <Th>Asunto</Th>
              <Th>Prioridad</Th>
              <Th>Estado</Th>
              <Th>Creado</Th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <Tr key={t.id}>
                <Td className="font-semibold text-foreground">{t.buyerName}</Td>
                <Td>{t.subject}</Td>
                <Td><Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge></Td>
                <Td><Badge tone={STATUS_TONE[t.status]}>{t.status.replace("_", " ")}</Badge></Td>
                <Td>{new Date(t.createdAt).toLocaleString("es-VE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
