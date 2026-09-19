import Link from "next/link";
import { requireOrganizer } from "@/lib/org/session";
import { loadSupportTickets } from "@/lib/org/data";
import { longDateTime } from "@/lib/format";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { NewTicketForm } from "@/components/org/SupportForms";
import { SUPPORT_CATEGORIES } from "@/lib/support";

export const dynamic = "force-dynamic";

const STATUS = {
  abierto: { label: "Abierto", tone: "warning" },
  en_proceso: { label: "En proceso", tone: "pink" },
  resuelto: { label: "Resuelto", tone: "success" },
  cerrado: { label: "Cerrado", tone: "neutral" },
} as const;

const FAQ = [
  { q: "¿Cuándo puedo retirar mi dinero?", a: "Depende de tu plan: Básico, 3 días después de que termina el evento; Pro, 3 días después de cada venta; Business, 24 horas. Lo ves en Finanzas como «Por liberar»." },
  { q: "Un comprador pagó pero no ve sus entradas.", a: "Los pagos por Pago Móvil, transferencia y Zelle los confirma Plann de 8 a. m. a 12 a. m. Cuando se aprueba, las entradas le llegan solas y tú recibes el aviso de venta. Si pasó más de una hora, escríbenos con el evento y la referencia." },
  { q: "¿Cómo reembolso una compra?", a: "En Ventas, botón «Reembolsar» junto a la compra. Sale de tu saldo, se anulan sus entradas y Plann le devuelve el dinero al comprador. No se puede si alguien ya entró con esas entradas." },
  { q: "Cancelé un evento, ¿qué pasa con las ventas?", a: "Se cierran las ventas y las compras pagadas quedan por reembolsar. Ese dinero ya no cuenta en tu saldo y a los compradores les llega un aviso." },
  { q: "¿Cómo invito a alguien a validar entradas?", a: "En Equipo, con su correo y el rol «Puerta». Si aún no tiene cuenta, queda invitada y entra sola cuando se registre." },
  { q: "¿Qué comisión cobra Plann?", a: "12 % en Básico, 8 % en Pro y 6 % en Business, sobre el precio después de descuentos. El fee de servicio lo paga el comprador." },
];

export default async function SupportPage() {
  await requireOrganizer();
  const tickets = await loadSupportTickets();
  const cat = new Map(SUPPORT_CATEGORIES.map((c) => [c.id, c.label]));

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Ayuda y soporte" subtitle="Respuestas rápidas y, si no alcanzan, escríbenos. Respondemos de 8 a. m. a 12 a. m." />

      <Card>
        <CardHeader title="Preguntas frecuentes" />
        <div className="divide-y divide-border">
          {FAQ.map((f) => (
            <details key={f.q} className="group px-5 py-3.5">
              <summary className="cursor-pointer list-none text-[14px] font-bold text-foreground marker:hidden">{f.q}</summary>
              <p className="mt-2 text-[13.5px] leading-relaxed text-foreground-3">{f.a}</p>
            </details>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Escribirle a Plann" />
        <div className="p-5">
          <NewTicketForm />
        </div>
      </Card>

      <Card>
        <CardHeader title="Tus consultas" />
        {tickets.length === 0 ? (
          <EmptyState title="Todavía no has escrito a soporte" />
        ) : (
          <ul className="divide-y divide-border">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link href={`/organizador/soporte/${t.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-surface-muted">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold text-foreground">{t.subject}</p>
                    <p className="text-[12px] text-foreground-3">
                      {cat.get(t.category)} · {longDateTime(t.last_message_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {t.priority === "alta" && <Badge tone="pink">Prioritaria</Badge>}
                    <Badge tone={STATUS[t.status].tone}>{STATUS[t.status].label}</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
