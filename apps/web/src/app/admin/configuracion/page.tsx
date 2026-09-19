"use client";

import { useState } from "react";
import { Badge, Button, Card, CardHeader, PageHeader } from "@/components/ui";

const PLAN_ROWS = [
  { plan: "Básico", commission: 12 },
  { plan: "Pro", commission: 9 },
  { plan: "Business", commission: 7 },
];

const FEATURE_FLAGS = [
  { key: "zelle", label: "Pago con Zelle", on: true },
  { key: "binance", label: "Pago con Binance Pay", on: false },
  { key: "puntos_dobles", label: "Puntos dobles en Tours (septiembre)", on: true },
  { key: "modo_mantenimiento", label: "Modo mantenimiento", on: false },
];

const TEAM = [
  { name: "Grey", role: "Superadmin", twofa: true },
  { name: "Ana", role: "Finanzas", twofa: true },
  { name: "Luis", role: "Soporte", twofa: false },
];

export default function ConfiguracionPage() {
  const [commissions, setCommissions] = useState(PLAN_ROWS);
  const [flags, setFlags] = useState(FEATURE_FLAGS);

  return (
    <div>
      <PageHeader title="Configuración" help="Ajustes globales de Plann: cuentas receptoras, comisiones por plan, banderas de funciones y equipo. Cada cambio queda en la auditoría." subtitle="Nada de esto está escrito en el código: cada cambio queda en el registro de auditoría." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Comisión por plan" subtitle="Aplica solo a órdenes nuevas" />
          <div className="space-y-3 p-5">
            {commissions.map((row, i) => (
              <div key={row.plan} className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-semibold text-foreground">{row.plan}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={row.commission}
                    onChange={(e) =>
                      setCommissions((rows) => rows.map((r, idx) => (idx === i ? { ...r, commission: Number(e.target.value) } : r)))
                    }
                    className="w-20 rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-right text-[13px] outline-none focus:border-pink"
                  />
                  <span className="text-[13px] text-foreground-3">%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Banderas de funciones" subtitle="Activar métodos de pago o secciones sin publicar versión nueva" />
          <div className="divide-y divide-border">
            {flags.map((f, i) => (
              <div key={f.key} className="flex items-center justify-between px-5 py-3">
                <span className="text-[13px] font-semibold text-foreground">{f.label}</span>
                <button
                  onClick={() => setFlags((list) => list.map((x, idx) => (idx === i ? { ...x, on: !x.on } : x)))}
                  className={`h-6 w-11 rounded-full transition-colors ${f.on ? "bg-pink" : "bg-surface-muted border border-border-strong"}`}
                >
                  <span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${f.on ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Equipo Plann" subtitle="Roles y autenticación de dos factores" />
          <div className="divide-y divide-border">
            {TEAM.map((m) => (
              <div key={m.name} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-[13px] font-bold text-foreground">{m.name}</p>
                  <p className="text-[11.5px] text-foreground-3">{m.role}</p>
                </div>
                <Badge tone={m.twofa ? "success" : "warning"}>{m.twofa ? "2FA activo" : "2FA pendiente"}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-[13px] font-bold text-foreground">Categorías, ciudades y textos legales</p>
          <p className="mt-1 text-[12.5px] text-foreground-3">
            Se administran aquí en la Fase 1 conectada a Supabase. En este MVP viven en <code className="rounded bg-surface-muted px-1 py-0.5 text-[11.5px]">apps/mobile/src/mock/data.ts</code> y en este mismo dataset simulado.
          </p>
          <Button variant="ghost" className="mt-4" onClick={() => alert("Disponible cuando se conecte la base de datos real.")}>
            Editar catálogos
          </Button>
        </Card>
      </div>
    </div>
  );
}
