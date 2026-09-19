import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrganizer } from "@/lib/org/session";
import { loadSupportTicket } from "@/lib/org/data";
import { longDateTime } from "@/lib/format";
import { Badge, Card } from "@/components/ui";
import { ReplyForm } from "@/components/org/SupportForms";

export const dynamic = "force-dynamic";

export default async function SupportThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireOrganizer();
  const data = await loadSupportTicket(id);
  if (!data) notFound();
  const { ticket, messages } = data;

  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/organizador/soporte" className="text-[13px] font-bold text-foreground-3 hover:text-pink">
        ← Ayuda y soporte
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[22px] font-extrabold tracking-tight text-foreground">{ticket.subject}</h1>
        <Badge tone={ticket.status === "resuelto" ? "success" : ticket.status === "cerrado" ? "neutral" : "warning"}>{ticket.status.replace("_", " ")}</Badge>
        {ticket.priority === "alta" && <Badge tone="pink">Prioritaria</Badge>}
      </div>
      <div className="space-y-3">
        {messages.map((m) => (
          <Card key={m.id} className={`p-4 ${m.author_role === "staff" ? "border-pink/40 bg-pink-soft/30" : ""}`}>
            <p className="text-[12px] font-bold text-foreground-3">
              {m.author_role === "staff" ? "Plann" : "Tú"} · {longDateTime(m.created_at)}
            </p>
            <p className="mt-1 whitespace-pre-line text-[14px] text-foreground-2">{m.body}</p>
          </Card>
        ))}
      </div>
      {ticket.status !== "cerrado" && (
        <Card className="p-5">
          <ReplyForm ticketId={ticket.id} />
        </Card>
      )}
    </div>
  );
}
