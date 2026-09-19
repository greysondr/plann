"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DayPoint } from "@/lib/org/analytics";

const PINK = "#e9417f";
const INK = "#151510";
const GRID = "rgba(21,21,16,0.08)";
const AXIS = { fontSize: 11.5, fill: "rgba(21,21,16,0.5)" };
export const PALETTE = [PINK, INK, "#8a8a80", "#f3a3c2", "#c9c2b4", "#5b5b52"];

const money = (v: number) => `$${v.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid rgba(21,21,16,0.1)",
  boxShadow: "0 4px 16px rgba(21,21,16,0.08)",
  fontSize: 12.5,
};

export function SalesChart({ data, height = 260 }: { data: DayPoint[]; height?: number }) {
  const rows = data.map((d) => ({ label: d.label, ingresos: d.netCents / 100, entradas: d.tickets }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PINK} stopOpacity={0.28} />
            <stop offset="100%" stopColor={PINK} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
        <YAxis yAxisId="left" tick={AXIS} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => `$${v}`} />
        <YAxis yAxisId="right" orientation="right" tick={AXIS} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => [name === "ingresos" ? money(Number(value)) : Number(value), name === "ingresos" ? "Ingresos netos" : "Entradas"]}
        />
        <Area yAxisId="left" type="monotone" dataKey="ingresos" stroke={PINK} strokeWidth={2.2} fill="url(#netFill)" />
        <Line yAxisId="right" type="monotone" dataKey="entradas" stroke={INK} strokeWidth={1.6} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBars({
  data,
  valueLabel = "Ingresos netos",
  currency = true,
  height,
}: {
  data: { name: string; value: number }[];
  valueLabel?: string;
  currency?: boolean;
  height?: number;
}) {
  const h = height ?? Math.max(120, data.length * 44 + 20);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => (currency ? `$${v}` : String(v))} />
        <YAxis
          type="category"
          dataKey="name"
          width={150}
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [currency ? money(Number(v)) : Number(v), valueLabel]} cursor={{ fill: "rgba(233,65,127,0.06)" }} />
        <Bar dataKey="value" fill={PINK} radius={[0, 8, 8, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ColumnChart({ data, height = 200, label = "Entradas" }: { data: { label: string; value: number }[]; height?: number; label?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [Number(v), label]} cursor={{ fill: "rgba(233,65,127,0.06)" }} />
        <Bar dataKey="value" fill={PINK} radius={[8, 8, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AreaTrend({ data, height = 220 }: { data: { label: string; value: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PINK} stopOpacity={0.28} />
            <stop offset="100%" stopColor={PINK} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={34} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [Number(v), "Entradas vendidas"]} />
        <Area type="monotone" dataKey="value" stroke={PINK} strokeWidth={2.2} fill="url(#trendFill)" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, currency = true }: { data: { name: string; value: number }[]; currency?: boolean }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-4">
      <div className="h-[170px] w-[170px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={52} outerRadius={80} paddingAngle={2} strokeWidth={0}>
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => (currency ? money(Number(v)) : Number(v))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="min-w-0 flex-1 space-y-2">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2 text-[12.5px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="truncate text-foreground-2">{d.name}</span>
            <span className="ml-auto shrink-0 font-bold text-foreground">{total > 0 ? `${Math.round((d.value / total) * 100)}%` : "0%"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
