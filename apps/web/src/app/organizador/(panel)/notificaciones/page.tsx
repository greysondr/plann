import Link from "next/link";
import { loadNotifications } from "@/lib/org/data";
import { longDateTime } from "@/lib/format";
import { requireOrganizer } from "@/lib/org/session";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { markNotificationsReadAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await requireOrganizer();
  const items = await loadNotifications();
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Notificaciones"
        subtitle="Ventas, cupos, retiros y avisos de Plann. También te llegan al teléfono si tienes la app."
        action={
          unread > 0 ? (
            <form action={markNotificationsReadAction}>
              <Button type="submit" variant="ghost">
                Marcar {unread} como leídas
              </Button>
            </form>
          ) : undefined
        }
      />
      <Card>
        {items.length === 0 ? (
          <EmptyState title="Todavía no tienes notificaciones" />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((n) => {
              const route = typeof n.data?.route === "string" ? (n.data.route as string) : null;
              const href = route && route.startsWith("/organizador") ? route : route?.startsWith("/soporte/") ? `/organizador${route}` : null;
              const body = (
                <div className="flex items-start gap-3 px-5 py-4">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-pink"}`} />
                  <div className="min-w-0">
                    <p className={`text-[14px] font-bold ${n.read_at ? "text-foreground-2" : "text-foreground"}`}>{n.title}</p>
                    <p className="text-[13.5px] text-foreground-3">{n.body}</p>
                    <p className="mt-0.5 text-[12px] text-foreground-4">{longDateTime(n.created_at)}</p>
                  </div>
                </div>
              );
              return <li key={n.id}>{href ? <Link href={href} className="block hover:bg-surface-muted">{body}</Link> : body}</li>;
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
