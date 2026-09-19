import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Badge, Button, Card } from "@/components/ui";
import { replyTicketAction, setTicketStatusAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const { data: ticket } = await db.from("support_tickets").select("*").eq("id", id).maybeSingle();
  if (!ticket) notFound();
  const [{ data: messages }, { data: user }, { data: org }, { data: order }] = await Promise.all([
    db.from("support_messages").select("id, author_role, body, created_at").eq("ticket_id", id).order("created_at"),
    db.from("users").select("email, full_name").eq("id", ticket.user_id).maybeSingle(),
    ticket.organizer_id ? db.from("organizers").select("name, plan").eq("id", ticket.organizer_id).maybeSingle() : Promise.resolve({ data: null }),
    ticket.order_id ? db.from("orders").select("id, status, total_usd_cents").eq("id", ticket.order_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/admin/soporte" className="text-[13px] font-bold text-foreground-3 hover:text-pink">
        ← Soporte
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[22px] font-extrabold tracking-tight text-foreground">{ticket.subject}</h1>
        <Badge tone={ticket.status === "resuelto" ? "success" : ticket.status === "cerrado" ? "neutral" : "warning"}>{ticket.status.replace("_", " ")}</Badge>
        {ticket.priority === "alta" && <Badge tone="pink">Prioritaria</Badge>}
      </div>
      <Card className="grid gap-2 p-4 text-[13px] sm:grid-cols-3">
        <div>
          <p className="text-[11.5px] font-bold uppercase text-foreground-3">Quién</p>
          <p className="font-semibold text-foreground">{user?.full_name || user?.email}</p>
          <p className="text-foreground-3">{user?.email}</p>
        </div>
        <div>
          <p className="text-[11.5px] font-bold uppercase text-foreground-3">Cuenta</p>
          <p className="font-semibold text-foreground">{org ? `Organizador · ${org.name} (${org.plan})` : "Comprador"}</p>
        </div>
        <div>
          <p className="text-[11.5px] font-bold uppercase text-foreground-3">Categoría</p>
          <p className="font-semibold text-foreground">{ticket.category}</p>
          {order && <p className="text-foreground-3">Orden {order.id.slice(0, 8)} · {order.status}</p>}
        </div>
      </Card>
      <div className="space-y-3">
        {(messages ?? []).map((m) => (
          <Card key={m.id} className={`p-4 ${m.author_role === "staff" ? "border-pink/40 bg-pink-soft/30" : ""}`}>
            <p className="text-[12px] font-bold text-foreground-3">
              {m.author_role === "staff" ? "Plann" : user?.full_name || user?.email} · {new Date(m.created_at).toLocaleString("es-VE")}
            </p>
            <p className="mt-1 whitespace-pre-line text-[14px] text-foreground-2">{m.body}</p>
          </Card>
        ))}
      </div>
      <Card className="space-y-3 p-5">
        <form action={replyTicketAction.bind(null, id)} className="space-y-3">
          <textarea name="body" required maxLength={2000} rows={4} placeholder="Tu respuesta le llega como notificación" className="w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] outline-none focus:border-pink" />
          <Button type="submit">Responder</Button>
        </form>
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          {(["en_proceso", "resuelto", "cerrado", "abierto"] as const).map((s) => (
            <form key={s} action={setTicketStatusAction.bind(null, id, s)}>
              <Button type="submit" variant="ghost" disabled={ticket.status === s}>
                Marcar {s.replace("_", " ")}
              </Button>
            </form>
          ))}
        </div>
      </Card>
    </div>
  );
}
