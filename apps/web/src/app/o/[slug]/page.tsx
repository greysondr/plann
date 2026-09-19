import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFollowers, getOrganizerEvents, getOrganizerRating, getOrganizerReviews, getPublicOrganizer } from "@/lib/public/queries";
import { SITE_URL } from "@/lib/supabase/public";
import { longDateTime, usd } from "@/lib/format";
import { PublicShell, Stars } from "@/components/public/PublicShell";
import { Badge, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const org = await getPublicOrganizer(slug);
  if (!org) return { title: "Organizador no encontrado · Plann" };
  const description = org.bio ?? `Eventos de ${org.name} en Plann`;
  return { metadataBase: new URL(SITE_URL), title: `${org.name} · Plann`, description, openGraph: { title: org.name, description, images: org.logo_url ? [org.logo_url] : [] } };
}

export default async function PublicOrganizerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getPublicOrganizer(slug);
  if (!org) notFound();
  const [events, rating, followers, reviews] = await Promise.all([getOrganizerEvents(org.id), getOrganizerRating(org.id), getFollowers(org.id), getOrganizerReviews(org.id)]);
  const now = Date.now();
  const upcoming = events.filter((e) => e.status !== "finished" && new Date(e.starts_at).getTime() >= now).sort((a, b) => (a.starts_at < b.starts_at ? -1 : 1));
  const past = events.filter((e) => !upcoming.includes(e));
  const min = (e: (typeof events)[number]) => {
    const p = e.ticket_types.map((t) => t.price_cents);
    return p.length === 0 ? "" : Math.min(...p) === 0 ? "Gratis" : `desde ${usd(Math.min(...p.filter((x) => x > 0)))}`;
  };

  const Card_ = ({ e }: { e: (typeof events)[number] }) => (
    <Link href={`/e/${e.slug}`} className="group overflow-hidden rounded-2xl border border-border bg-surface transition-shadow hover:shadow-md">
      <div className="aspect-video bg-surface-muted">
        {e.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.images[0]} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="p-4">
        <p className="truncate text-[15px] font-extrabold text-foreground group-hover:text-pink">{e.title}</p>
        <p className="text-[12.5px] text-foreground-3">{longDateTime(e.starts_at)}</p>
        <p className="mt-1 text-[13px] font-bold text-foreground-2">{min(e)}</p>
      </div>
    </Link>
  );

  return (
    <PublicShell>
      <div className="flex items-center gap-5">
        {org.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.logo_url} alt="" className="h-20 w-20 rounded-2xl object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-pink-soft text-[30px] font-extrabold text-pink">{org.name.slice(0, 1)}</div>
        )}
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-foreground">{org.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-[13.5px] text-foreground-3">
            <Badge tone="pink">Verificado</Badge>
            {rating && (
              <span className="flex items-center gap-1.5">
                <Stars value={rating.avg} /> {rating.avg.toFixed(1)} ({rating.count})
              </span>
            )}
            <span>
              {followers} {followers === 1 ? "seguidor" : "seguidores"}
            </span>
            {org.cities && <span>{org.cities.name}</span>}
          </p>
        </div>
      </div>
      {org.bio && <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-foreground-2">{org.bio}</p>}
      <p className="mt-3 text-[12.5px] text-foreground-3">Para seguirlo y enterarte de sus eventos nuevos, abre Plann en tu teléfono.</p>

      <h2 className="mb-3 mt-10 text-[18px] font-extrabold text-foreground">Próximos eventos</h2>
      {upcoming.length === 0 ? (
        <Card className="p-6 text-[14px] text-foreground-3">No tiene eventos próximos publicados.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">{upcoming.map((e) => <Card_ key={e.id} e={e} />)}</div>
      )}

      {past.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-[18px] font-extrabold text-foreground">Eventos anteriores</h2>
          <div className="grid gap-4 sm:grid-cols-3">{past.slice(0, 6).map((e) => <Card_ key={e.id} e={e} />)}</div>
        </>
      )}

      {reviews.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-[18px] font-extrabold text-foreground">Reseñas</h2>
          <div className="space-y-3">
            {reviews.map((r) => (
              <Card key={r.id} className="space-y-1.5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[13.5px] font-bold text-foreground">{r.author_name}</p>
                  <Stars value={r.rating} />
                </div>
                {r.comment && <p className="text-[14px] text-foreground-2">{r.comment}</p>}
                {r.reply && (
                  <p className="border-l-2 border-pink pl-3 text-[13px] text-foreground-3">
                    <span className="font-bold text-foreground-2">Respuesta: </span>
                    {r.reply}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </PublicShell>
  );
}
