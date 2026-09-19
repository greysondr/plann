import Link from "next/link";
import clsx from "clsx";
import { Badge } from "@/components/ui";

export function ProgressBar({ value, tone = "pink" }: { value: number; tone?: "pink" | "ink" }) {
  const width = `${Math.min(100, Math.max(0, value * 100))}%`;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted ring-1 ring-inset ring-border">
      <div className={clsx("h-full rounded-full", tone === "pink" ? "bg-pink" : "bg-foreground")} style={{ width }} />
    </div>
  );
}

export function RangeTabs({ current, basePath, options = [7, 30, 90] }: { current: number; basePath: string; options?: number[] }) {
  return (
    <div className="inline-flex rounded-full border border-border-strong bg-surface p-1">
      {options.map((d) => (
        <Link
          key={d}
          href={`${basePath}?rango=${d}`}
          className={clsx(
            "rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-colors",
            d === current ? "bg-pink text-white" : "text-foreground-2 hover:bg-surface-muted"
          )}
        >
          {d} días
        </Link>
      ))}
    </div>
  );
}

const EVENT_STATUS: Record<string, { label: string; tone: "neutral" | "pink" | "success" | "warning" | "danger" }> = {
  draft: { label: "Borrador", tone: "neutral" },
  in_review: { label: "En revisión", tone: "warning" },
  published: { label: "Publicado", tone: "pink" },
  sold_out: { label: "Agotado", tone: "success" },
  live: { label: "En curso", tone: "pink" },
  finished: { label: "Finalizado", tone: "neutral" },
  cancelled: { label: "Cancelado", tone: "danger" },
};

export function EventStatusBadge({ status, paused }: { status: string; paused?: boolean }) {
  if (paused && status !== "cancelled" && status !== "finished") return <Badge tone="warning">Ventas pausadas</Badge>;
  const s = EVENT_STATUS[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

const ORDER_STATUS: Record<string, { label: string; tone: "neutral" | "pink" | "success" | "warning" | "danger" }> = {
  paid: { label: "Pagada", tone: "success" },
  pending_payment: { label: "Pendiente de pago", tone: "warning" },
  in_verification: { label: "Verificando pago", tone: "warning" },
  expired: { label: "Expirada", tone: "neutral" },
  cancelled: { label: "Cancelada", tone: "neutral" },
  refund_pending: { label: "Por reembolsar", tone: "danger" },
  refunded: { label: "Reembolsada", tone: "neutral" },
  partially_refunded: { label: "Reembolso parcial", tone: "neutral" },
};

export function OrderStatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUS[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function Thumb({ src, alt }: { src?: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src || undefined} alt={alt} className="h-11 w-[74px] shrink-0 rounded-lg bg-surface-muted object-cover ring-1 ring-inset ring-border" />
  );
}

export function deltaText(delta: number | null): { text: string; tone: "success" | "danger" } | undefined {
  if (delta === null) return { text: "nuevo", tone: "success" };
  if (delta === 0) return undefined;
  const sign = delta > 0 ? "+" : "−";
  return { text: `${sign}${Math.round(Math.abs(delta) * 100)}%`, tone: delta > 0 ? "success" : "danger" };
}
