import { requireOrganizer } from "@/lib/org/session";
import { loadEvents, loadReviews } from "@/lib/org/data";
import { shortDate } from "@/lib/format";
import { Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { ReviewReply } from "@/components/org/ReviewReply";

export const dynamic = "force-dynamic";

const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export default async function ReviewsPage() {
  const { organizer } = await requireOrganizer();
  const [reviews, events] = await Promise.all([loadReviews(organizer.id), loadEvents(organizer.id)]);
  const title = new Map(events.map((e) => [e.id, e.title]));
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const unanswered = reviews.filter((r) => !r.reply).length;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, count: reviews.filter((r) => r.rating === n).length }));

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Reseñas" subtitle="Lo que dicen quienes asistieron a tus eventos. Tus respuestas son públicas." />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Calificación" value={reviews.length ? avg.toFixed(1) : "—"} hint={`${reviews.length} ${reviews.length === 1 ? "reseña" : "reseñas"}`} />
        <StatCard label="Sin responder" value={String(unanswered)} />
        <Card className="col-span-2 p-5">
          <p className="mb-2 text-[12.5px] font-bold uppercase tracking-wide text-foreground-3">Distribución</p>
          <div className="space-y-1">
            {dist.map((d) => (
              <div key={d.n} className="flex items-center gap-2 text-[12px]">
                <span className="w-6 text-foreground-3">{d.n} ★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                  <div className="h-full rounded-full bg-pink" style={{ width: `${reviews.length ? (d.count / reviews.length) * 100 : 0}%` }} />
                </div>
                <span className="w-6 text-right text-foreground-3">{d.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <CardHeader title="Todas las reseñas" />
        {reviews.length === 0 ? (
          <EmptyState title="Todavía no tienes reseñas" subtitle="Quienes asistan a tus eventos podrán calificarlos desde la app." />
        ) : (
          <ul className="divide-y divide-border">
            {reviews.map((r) => (
              <li key={r.id} className="space-y-2 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[14px] font-bold text-foreground">
                    {r.author_name} <span className="ml-1 text-pink">{stars(r.rating)}</span>
                  </p>
                  <p className="text-[12px] text-foreground-3">
                    {title.get(r.event_id) ?? "Evento"} · {shortDate(r.created_at)}
                  </p>
                </div>
                {r.comment && <p className="text-[14px] text-foreground-2">{r.comment}</p>}
                {r.reply && (
                  <p className="border-l-2 border-pink pl-3 text-[13px] text-foreground-3">
                    <span className="font-bold text-foreground-2">Tu respuesta: </span>
                    {r.reply}
                  </p>
                )}
                <ReviewReply reviewId={r.id} existing={r.reply} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
