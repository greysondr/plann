"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { buyers, centsToUsd } from "@/lib/mock-data";
import { Badge, Card, PageHeader, Table, Td, Th, Tr } from "@/components/ui";

const TIER_LABEL: Record<string, string> = {
  explorador: "Explorador",
  frecuente: "Frecuente",
  insider: "Insider",
  elite: "Elite",
  black: "Black",
};

export default function UsuariosPage() {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return buyers
      .filter((b) => !q || [b.name, b.email, b.phone, b.documentId].some((f) => f.toLowerCase().includes(q)))
      .sort((a, b) => b.totalSpentCents - a.totalSpentCents)
      .slice(0, 120);
  }, [query]);

  return (
    <div>
      <PageHeader title="Usuarios" subtitle="Compradores registrados — busca por nombre, correo, teléfono o cédula." />

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nombre, correo, teléfono o cédula…"
        className="mb-4 w-full max-w-md rounded-full border border-border-strong bg-surface px-4 py-2.5 text-[13px] outline-none focus:border-pink"
      />

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Comprador</Th>
              <Th>Ciudad</Th>
              <Th className="text-right">Órdenes pagadas</Th>
              <Th className="text-right">Gasto total</Th>
              <Th>Nivel</Th>
              <Th className="text-right">Puntos</Th>
              <Th>Estado</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <Tr key={b.id}>
                <Td>
                  <Link href={`/admin/usuarios/${b.id}`} className="font-bold text-foreground hover:text-pink">
                    {b.name}
                  </Link>
                  <p className="text-[11.5px] text-foreground-3">{b.email}</p>
                </Td>
                <Td>{b.city}</Td>
                <Td className="text-right">{b.paidOrdersCount}</Td>
                <Td className="text-right font-bold text-foreground">{centsToUsd(b.totalSpentCents)}</Td>
                <Td><Badge tone="pink">{TIER_LABEL[b.tier]}</Badge></Td>
                <Td className="text-right">{b.pointsBalance}</Td>
                <Td>{b.flagged ? <Badge tone="danger">Señalado</Badge> : <Badge tone="success">Normal</Badge>}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {rows.length === 0 && <p className="px-5 py-8 text-center text-[13px] text-foreground-3">Sin resultados para “{query}”.</p>}
      </Card>
    </div>
  );
}
