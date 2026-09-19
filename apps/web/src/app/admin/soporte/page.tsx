import Link from "next/link";
import clsx from "clsx";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Badge, Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui";

export const dynamic = "force-dynamic";

const CAT: Record<string, string> = { pago: "Pago", retiro: "Retiro", evento: "Evento", entrada: "Entradas", cuenta: "Cuenta", otro: "Otro" };
const STATUS = {
  abierto: { label: "Abierto", tone: "warning" },
  en_proceso: { label: "En proceso", tone: "pink" },
  resuelto: { label: "Resuelto", tone: "success" },
  cerrado: { label: "Cerrado", tone: "neutral" },
} as const;
const TABS = [
  { id: "activos", label: "Activos" },
  { id: "resuelto", label: "Resueltos" },
  { id: "cerrado", label: "Cerrados" },
  { id: "todos", label: "Todos" },
];

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver } = await searchParams;
  const tab = TABS.some((t) => t.id === ver) ? ver! : "activos";
  const db = supabaseAdmin();
  const { data: rows } = await db
    .from("support_tickets")
    .select("id, user_id, organizer_id, category, subject, status, priority, created_at, last_message_at")
    .order("last_message_at", { ascending: false })
    .limit(300);
  const tickets = (rows ?? []) as { id: string; user_id: string; organizer_id: string | null; category: string; subject: string; status: keyof typeof STATUS; priority: string; created_at: string; last_message_at: string }[];
  const ids = [...new Set(tickets.map((t) => t.user_id))];
  const { data: users } = ids.length ? await db.from("users").select("id, email, full_name").in("id", ids) : { data: [] as { id: string; email: string; full_name: string | null }[] };
  const who = new Map((users ?? []).map((u) => [u.id, u]));

  const active = tickets.filter((t) => t.status === "abierto" || t.status === "en_proceso");
  const shown = tickets
    .filter((t) => (tab === "todos" ? true : tab === "activos" ? active.includes(t) : t.status === tab))
    .sort((a, b) => (tab === "activos" && a.priority !== b.priority ? (a.priority === "alta" ? -1 : 1) : a.last_message_at < b.last_message_at ? 1 : -1));

  return (
    <div className="space-y-6">
      <PageHeader title="Soporte" subtitle="Consultas de compradores y organizadores. Las de organizadores Business van primero." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Abiertos" value={String(tickets.filter((t) => t.status === "abierto").length)} hint="sin atender" />
        <StatCard label="En proceso" value={String(tickets.filter((t) => t.status === "en_proceso").length)} />
        <StatCard label="Prioritarios" value={String(active.filter((t) => t.priority === "alta").length)} hint="organizadores Business" />
        <StatCard label="Resueltos" value={String(tickets.filter((t) => t.status === "resuelto").length)} />
      </div>
      <div className="inline-flex rounded-full border border-border-strong bg-surface p-1">
        {TABS.map((t) => (
          <Link key={t.id} href={`/admin/soporte?ver=${t.id}`} className={clsx("rounded-full px-4 py-1.5 text-[12.5px] font-bold", t.id === tab ? "bg-pink text-white" : "text-foreground-2 hover:bg-surface-muted")}>
            {t.label}
          </Link>
        ))}
      </div>
      <Card>
        <CardHeader title="Consultas" />
        {shown.length === 0 ? (
          <EmptyState title="No hay consultas aquí" />
        ) : (
          <ul className="divide-y divide-border">
            {shown.map((t) => {
              const u = who.get(t.user_id);
              return (
                <li key={t.id}>
                  <Link href={`/admin/soporte/${t.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-surface-muted">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-bold text-foreground">{t.subject}</p>
                      <p className="text-[12px] text-foreground-3">
                        {u?.full_name || u?.email} · {CAT[t.category]} · {new Date(t.last_message_at).toLocaleString("es-VE", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                        {t.organizer_id ? " · organizador" : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {t.priority === "alta" && <Badge tone="pink">Prioritaria</Badge>}
                      <Badge tone={STATUS[t.status].tone}>{STATUS[t.status].label}</Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
