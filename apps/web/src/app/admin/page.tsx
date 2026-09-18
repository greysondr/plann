"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import {
  buyers,
  centsToUsd,
  events,
  gmvByDay,
  organizers,
  orders,
  paymentQueue,
  revenueByChannel,
  salesByCategory,
  salesByCity,
  salesByMethod,
  withdrawals,
} from "@/lib/mock-data";
import { Badge, Card, CardHeader, PageHeader, StatCard } from "@/components/ui";

const PINK = "#e9417f";
const PIE_COLORS = ["#e9417f", "#151510", "#a9741a", "#1f6b46", "#7a6ff0"];
const PERIODS = [7, 30, 60] as const;

function daysAgoDate(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(30);

  const gmvSeries = useMemo(() => gmvByDay(period), [period]);
  const cutoff = useMemo(() => daysAgoDate(period), [period]);
  const prevCutoff = useMemo(() => daysAgoDate(period * 2), [period]);

  const paidOrders = orders.filter((o) => o.status === "pagada");
  const paidInPeriod = paidOrders.filter((o) => new Date(o.createdAt) >= cutoff);
  const paidInPrevPeriod = paidOrders.filter((o) => new Date(o.createdAt) >= prevCutoff && new Date(o.createdAt) < cutoff);
  const gmv = paidInPeriod.reduce((s, o) => s + o.subtotalCents, 0);
  const gmvPrev = paidInPrevPeriod.reduce((s, o) => s + o.subtotalCents, 0);
  const gmvDeltaPct = gmvPrev > 0 ? Math.round(((gmv - gmvPrev) / gmvPrev) * 1000) / 10 : 0;

  const plannRevenue = paidInPeriod.reduce((s, o) => s + o.commissionCents + o.feeCents, 0);

  const ordersInPeriod = orders.filter((o) => new Date(o.createdAt) >= cutoff);
  const funnel = useMemo(() => {
    const created = ordersInPeriod.length;
    const paid = ordersInPeriod.filter((o) => o.status === "pagada").length;
    const abandoned = ordersInPeriod.filter((o) => o.status === "expirada" || o.status === "cancelada").length;
    return { created, paid, abandoned, conversionPct: created ? Math.round((paid / created) * 1000) / 10 : 0 };
  }, [ordersInPeriod]);

  const newBuyers = buyers.filter((b) => new Date(b.createdAt) >= cutoff).length;
  const activeBuyerIds = new Set(paidInPeriod.map((o) => o.buyerId));
  const recurrentBuyers = buyers.filter((b) => b.paidOrdersCount > 1 && activeBuyerIds.has(b.id)).length;

  const activeOrganizers = organizers.filter((o) => o.verification === "verificado").length;
  const pendingOrganizers = organizers.filter((o) => o.verification === "pendiente").length;
  const newOrganizers = organizers.filter((o) => new Date(o.createdAt) >= cutoff).length;

  const publishedEvents = events.filter((e) => e.status === "publicado").length;
  const inReviewEvents = events.filter((e) => e.status === "en_revision").length;
  const upcoming7d = events.filter((e) => {
    const d = new Date(e.startsAt);
    const now = new Date();
    const in7 = new Date();
    in7.setDate(now.getDate() + 7);
    return e.status === "publicado" && d >= now && d <= in7;
  }).length;

  const queue = paymentQueue();
  const avgWait = queue.length ? Math.round(queue.reduce((s, o) => s + (o.waitingMinutes ?? 0), 0) / queue.length) : 0;
  const pendingWithdrawals = withdrawals.filter((w) => w.status === "pendiente");
  const pendingWithdrawalsCents = pendingWithdrawals.reduce((s, w) => s + w.amountCents, 0);

  const revenueChannels = useMemo(() => revenueByChannel(), []);
  const categorySales = useMemo(() => salesByCategory(), []);
  const methodSales = useMemo(() => salesByMethod(), []);
  const citySales = useMemo(() => salesByCity(), []);
  const maxCitySale = Math.max(...citySales.map((c) => c.value), 1);

  const alerts = useMemo(() => {
    const list: { tone: "danger" | "warning"; text: string; href: string }[] = [];
    const lateQueue = queue.filter((o) => (o.waitingMinutes ?? 0) > 15);
    if (lateQueue.length) list.push({ tone: "danger", text: `${lateQueue.length} pago${lateQueue.length === 1 ? "" : "s"} con más de 15 min sin verificar`, href: "/admin/pagos" });
    const reported = events.filter((e) => e.reportsCount > 0);
    if (reported.length) list.push({ tone: "warning", text: `${reported.length} evento${reported.length === 1 ? "" : "s"} con reportes de usuarios`, href: "/admin/eventos" });
    const bigWithdrawals = pendingWithdrawals.filter((w) => w.amountCents > 300000);
    if (bigWithdrawals.length) list.push({ tone: "warning", text: `${bigWithdrawals.length} retiro${bigWithdrawals.length === 1 ? "" : "s"} grande${bigWithdrawals.length === 1 ? "" : "s"} (> $3.000) pendiente de aprobar`, href: "/admin/retiros" });
    const highRefund = organizers.filter((o) => o.refundRatePct > 15);
    if (highRefund.length) list.push({ tone: "danger", text: `${highRefund.length} organizador${highRefund.length === 1 ? "" : "es"} con tasa de reembolso alta`, href: "/admin/organizadores" });
    const suspended = organizers.filter((o) => o.verification === "suspendido");
    if (suspended.length) list.push({ tone: "warning", text: `${suspended.length} organizador${suspended.length === 1 ? "" : "es"} suspendido${suspended.length === 1 ? "" : "s"}, revisar reincorporación`, href: "/admin/organizadores" });
    return list;
  }, [queue, pendingWithdrawals]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Vista general del negocio — datos simulados para el MVP, listos para conectarse a Supabase."
        action={
          <div className="flex gap-1 rounded-full border border-border bg-surface p-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-colors ${
                  period === p ? "bg-pink text-white" : "text-foreground-2 hover:bg-surface-muted"
                }`}
              >
                {p} días
              </button>
            ))}
          </div>
        }
      />

      {alerts.length > 0 && (
        <div className="mb-6 grid gap-2 sm:grid-cols-2">
          {alerts.map((a, i) => (
            <Link
              key={i}
              href={a.href}
              className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-[12.5px] font-semibold transition-colors ${
                a.tone === "danger" ? "border-danger/25 bg-danger-soft text-danger hover:bg-danger/15" : "border-warning/25 bg-warning-soft text-warning hover:bg-warning/15"
              }`}
            >
              <AlertTriangle size={15} />
              <span className="flex-1">{a.text}</span>
              <span className="text-[11.5px] underline underline-offset-2">Ver</span>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="GMV"
          value={centsToUsd(gmv)}
          delta={`${gmvDeltaPct >= 0 ? "+" : ""}${gmvDeltaPct}% vs. periodo anterior`}
          deltaTone={gmvDeltaPct >= 0 ? "success" : "danger"}
        />
        <StatCard label="Ingresos de Plann" value={centsToUsd(plannRevenue)} hint="comisiones + fees de servicio" />
        <StatCard
          label="Conversión de checkout"
          value={`${funnel.conversionPct}%`}
          hint={`${funnel.paid} pagadas de ${funnel.created} creadas`}
        />
        <StatCard label="Compradores nuevos" value={String(newBuyers)} hint={`${recurrentBuyers} recurrentes activos`} />
        <StatCard label="Organizadores activos" value={String(activeOrganizers)} hint={`${pendingOrganizers} pendientes de verificar · ${newOrganizers} nuevos`} />
        <StatCard label="Eventos publicados" value={String(publishedEvents)} hint={`${inReviewEvents} en revisión · ${upcoming7d} en 7 días`} />
        <StatCard
          label="Pagos por verificar"
          value={String(queue.length)}
          hint={queue.length ? `espera promedio ${avgWait} min` : "cola al día"}
          deltaTone={avgWait > 15 ? "danger" : "success"}
          delta={queue.length ? (avgWait > 15 ? "sobre la meta de 15 min" : "dentro de la meta") : undefined}
        />
        <StatCard label="Retiros pendientes" value={centsToUsd(pendingWithdrawalsCents)} hint={`${pendingWithdrawals.length} solicitudes`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="GMV por día" subtitle={`Ventas brutas en ventana de ${period} días, solo órdenes pagadas`} />
          <div className="h-72 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={gmvSeries} margin={{ left: 4, right: 12, top: 4 }}>
                <defs>
                  <linearGradient id="gmvFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PINK} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={PINK} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(21,21,16,0.08)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => d.slice(5)}
                  tick={{ fontSize: 11, fill: "rgba(21,21,16,0.5)" }}
                  axisLine={{ stroke: "rgba(21,21,16,0.1)" }}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis tick={{ fontSize: 11, fill: "rgba(21,21,16,0.5)" }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(value) => [`$${Number(value).toLocaleString("es-VE")}`, "GMV"]}
                  labelFormatter={(l) => `Día ${l}`}
                  contentStyle={{ borderRadius: 10, border: "1px solid rgba(21,21,16,0.12)", fontSize: 12.5 }}
                />
                <Area type="monotone" dataKey="gmv" stroke={PINK} strokeWidth={2} fill="url(#gmvFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Ingresos de Plann por vía" subtitle="Últimos 60 días" />
          <div className="h-72 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenueChannels} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {revenueChannels.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `$${Number(v).toLocaleString("es-VE")}`} contentStyle={{ borderRadius: 10, border: "1px solid rgba(21,21,16,0.12)", fontSize: 12.5 }} />
                <Legend verticalAlign="bottom" height={56} wrapperStyle={{ fontSize: 11.5 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Ventas por categoría" />
          <div className="h-64 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categorySales} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid stroke="rgba(21,21,16,0.08)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "rgba(21,21,16,0.5)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="name" width={82} tick={{ fontSize: 11.5, fill: "rgba(21,21,16,0.7)" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => `$${Number(v).toLocaleString("es-VE")}`} contentStyle={{ borderRadius: 10, border: "1px solid rgba(21,21,16,0.12)", fontSize: 12.5 }} />
                <Bar dataKey="value" fill={PINK} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Ventas por método de pago" />
          <div className="h-64 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={methodSales} dataKey="value" nameKey="name" outerRadius={80}>
                  {methodSales.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid rgba(21,21,16,0.12)", fontSize: 12.5 }} />
                <Legend verticalAlign="bottom" height={40} wrapperStyle={{ fontSize: 11.5 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Ventas por ciudad" subtitle="Mapa de calor simplificado" />
          <div className="space-y-3 px-5 py-5">
            {citySales.map((c) => (
              <div key={c.name}>
                <div className="mb-1 flex items-center justify-between text-[12.5px] font-semibold text-foreground-2">
                  <span>{c.name}</span>
                  <span>${Math.round(c.value).toLocaleString("es-VE")}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div className="h-full rounded-full bg-pink" style={{ width: `${(c.value / maxCitySale) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
