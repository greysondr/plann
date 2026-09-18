"use client";

import { useState } from "react";
import Link from "next/link";
import { centsToUsd, findOrganizer, organizers, withdrawals as seedWithdrawals } from "@/lib/mock-data";
import { Badge, Button, Card, CardHeader, PageHeader, StatCard, Table, Td, Th, Tr } from "@/components/ui";
import type { WithdrawalRequest } from "@/lib/types";

export default function RetirosPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(seedWithdrawals);

  const totalPasivo = organizers.reduce((s, o) => s + o.balanceAvailableCents + o.balancePendingCents, 0);
  const totalPending = withdrawals.filter((w) => w.status === "pendiente").reduce((s, w) => s + w.amountCents, 0);

  function resolve(id: string, status: "pagado" | "rechazado") {
    setWithdrawals((list) => list.map((w) => (w.id === id ? { ...w, status, resolvedAt: new Date().toISOString() } : w)));
  }

  return (
    <div>
      <PageHeader title="Retiros y liquidaciones" subtitle="Lo que Plann le debe a sus organizadores, en tiempo real." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Pasivo total con organizadores" value={centsToUsd(totalPasivo)} hint="saldo disponible + pendiente de liquidar" />
        <StatCard label="Retiros pendientes de aprobar" value={centsToUsd(totalPending)} hint={`${withdrawals.filter((w) => w.status === "pendiente").length} solicitudes`} />
        <StatCard label="Organizadores con saldo" value={String(organizers.filter((o) => o.balanceAvailableCents > 0).length)} />
      </div>

      <Card className="mt-6">
        <CardHeader title="Solicitudes de retiro" />
        <Table>
          <thead>
            <tr>
              <Th>Organizador</Th>
              <Th>Método</Th>
              <Th className="text-right">Monto</Th>
              <Th>Solicitado</Th>
              <Th>Estado</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.map((w) => {
              const org = findOrganizer(w.organizerId);
              return (
                <Tr key={w.id}>
                  <Td>
                    <Link href={`/admin/organizadores/${w.organizerId}`} className="font-semibold text-foreground hover:text-pink">
                      {org?.name ?? w.organizerId}
                    </Link>
                  </Td>
                  <Td>{w.method}</Td>
                  <Td className="text-right font-bold text-foreground">{centsToUsd(w.amountCents)}</Td>
                  <Td>{new Date(w.requestedAt).toLocaleDateString("es-VE")}</Td>
                  <Td>
                    <Badge tone={w.status === "pagado" ? "success" : w.status === "rechazado" ? "danger" : "warning"}>{w.status}</Badge>
                  </Td>
                  <Td>
                    {w.status === "pendiente" ? (
                      <div className="flex justify-end gap-1.5">
                        <Button className="!px-3 !py-1.5" onClick={() => resolve(w.id, "pagado")}>
                          Marcar pagado
                        </Button>
                        <Button variant="danger" className="!px-3 !py-1.5" onClick={() => resolve(w.id, "rechazado")}>
                          Rechazar
                        </Button>
                      </div>
                    ) : (
                      <span className="block text-right text-[12px] text-foreground-3">{w.reference ?? "—"}</span>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
