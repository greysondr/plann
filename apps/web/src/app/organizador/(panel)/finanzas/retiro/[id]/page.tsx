import Link from "next/link";
import { notFound } from "next/navigation";
import { can, requireRole } from "@/lib/org/session";
import { loadWithdrawals } from "@/lib/org/data";
import { longDateTime, usd } from "@/lib/format";
import { Badge } from "@/components/ui";
import { PrintButton } from "@/components/org/PrintButton";

export const dynamic = "force-dynamic";

const METHOD: Record<string, string> = { pago_movil: "Pago Móvil", transfer: "Transferencia", zelle: "Zelle" };
const STATUS = { pendiente: "En proceso", pagado: "Pagado", rechazado: "Rechazado" } as const;

export default async function WithdrawalReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizer } = await requireRole(can.money);
  const withdrawals = await loadWithdrawals(organizer.id);
  const w = withdrawals.find((x) => x.id === id);
  if (!w) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/organizador/finanzas" className="text-[13px] font-bold text-foreground-3 hover:text-pink">
          ← Finanzas
        </Link>
        <PrintButton />
      </div>
      <div className="rounded-2xl border border-border bg-surface p-8 shadow-[0_1px_2px_rgba(21,21,16,0.04)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-[26px] leading-none text-foreground">plann</p>
            <p className="mt-1 text-[12.5px] text-foreground-3">Comprobante de retiro</p>
          </div>
          <Badge tone={w.status === "pagado" ? "success" : w.status === "rechazado" ? "danger" : "warning"}>{STATUS[w.status]}</Badge>
        </div>
        <p className="mt-8 text-[13px] text-foreground-3">Monto</p>
        <p className="text-[36px] font-extrabold leading-none text-foreground">{usd(w.amount_cents)}</p>
        <dl className="mt-8 grid grid-cols-[130px_1fr] gap-y-3 text-[13.5px]">
          <dt className="text-foreground-3">Organizador</dt>
          <dd className="font-semibold text-foreground">{organizer.name}</dd>
          <dt className="text-foreground-3">Cédula o RIF</dt>
          <dd className="font-semibold text-foreground">{organizer.legal_document ?? "—"}</dd>
          <dt className="text-foreground-3">Método</dt>
          <dd className="font-semibold text-foreground">{METHOD[w.method] ?? w.method}</dd>
          <dt className="text-foreground-3">Cuenta de destino</dt>
          <dd className="font-semibold text-foreground">{w.reference}</dd>
          <dt className="text-foreground-3">Solicitado</dt>
          <dd className="font-semibold text-foreground">{longDateTime(w.requested_at)}</dd>
          <dt className="text-foreground-3">Referencia</dt>
          <dd className="font-mono text-[12.5px] text-foreground">{w.id.slice(0, 8).toUpperCase()}</dd>
        </dl>
        <p className="mt-8 border-t border-border pt-4 text-[11.5px] leading-relaxed text-foreground-3">
          {w.status === "pagado"
            ? "Este retiro fue pagado por Plann a la cuenta indicada."
            : w.status === "rechazado"
              ? "Este retiro fue rechazado y el monto sigue disponible en tu saldo."
              : "Este retiro está en proceso. Te avisamos cuando se pague."}
        </p>
      </div>
    </div>
  );
}
