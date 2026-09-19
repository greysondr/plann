import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventRating, getEventReviews, getPublicEvent, getFollowers, recordLinkVisit } from "@/lib/public/queries";
import { SITE_URL } from "@/lib/supabase/public";
import { longDateTime, shortDate, usd } from "@/lib/format";
import { PublicShell, Stars } from "@/components/public/PublicShell";
import { Badge, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

type SaleState = "on_sale" | "upcoming" | "ended" | "sold_out";
function saleState(t: { quantity: number; sold: number; reserved: number; sales_start: string | null; sales_end: string | null }): SaleState {
  const now = Date.now();
  if (t.sales_start && new Date(t.sales_start).getTime() > now) return "upcoming";
  if (t.sales_end && new Date(t.sales_end).getTime() < now) return "ended";
  return t.quantity - t.sold - t.reserved <= 0 ? "sold_out" : "on_sale";
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  if (!event) return { title: "Evento no encontrado · Plann" };
  const prices = event.ticket_types.map((t) => t.price_cents).filter((p) => p > 0);
  const price = prices.length ? `desde ${usd(Math.min(...prices))}` : "Gratis";
  const description = `${longDateTime(event.starts_at)} · ${event.venue_name ?? ""} · ${price}`;
  return {
    metadataBase: new URL(SITE_URL),
    title: `${event.title} · Plann`,
    description,
    openGraph: { title: event.title, description, type: "website", url: `/e/${event.slug}`, images: event.images[0] ? [{ url: event.images[0], width: 1200, height: 675 }] : [], locale: "es_VE" },
    twitter: { card: "summary_large_image", title: event.title, description, images: event.images[0] ? [event.images[0]] : [] },
  };
}

export default async function PublicEventPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ src?: string }> }) {
  const { slug } = await params;
  const { src } = await searchParams;
  const event = await getPublicEvent(slug);
  if (!event) notFound();

  const [reviews, rating, followers] = await Promise.all([getEventReviews(event.id), getEventRating(event.id), event.organizer_id ? getFollowers(event.organizer_id) : Promise.resolve(0)]);
  await recordLinkVisit(event.id, src);

  const org = event.organizers;
  const finished = event.status === "finished";
  const open = event.ticket_types.some((t) => saleState(t) === "on_sale") && !finished;

  return (
    <PublicShell>
      <div className="grid gap-8 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="aspect-video overflow-hidden rounded-3xl border border-border bg-surface-muted">
            {event.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.images[0]} alt={event.title} className="h-full w-full object-cover" />
            ) : null}
          </div>
          {event.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {event.images.slice(1).map((u) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={u} src={u} alt="" className="aspect-video h-20 shrink-0 rounded-xl object-cover" />
              ))}
            </div>
          )}
          <div>
            <p className="text-[12.5px] font-bold uppercase tracking-wide text-pink">
              {event.categories?.name ?? "Evento"}
              {finished ? " · Finalizado" : ""}
            </p>
            <h1 className="mt-1 text-[30px] font-extrabold leading-tight tracking-tight text-foreground">{event.title}</h1>
            {rating && (
              <p className="mt-2 flex items-center gap-2 text-[13.5px] text-foreground-2">
                <Stars value={rating.avg} /> {rating.avg.toFixed(1)} · {rating.count} {rating.count === 1 ? "reseña" : "reseñas"}
              </p>
            )}
          </div>
          {event.description && <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground-2">{event.description}</p>}

          <Card className="divide-y divide-border">
            <div className="px-5 py-4">
              <p className="text-[12px] font-bold uppercase text-foreground-3">Fecha</p>
              <p className="mt-1 text-[15px] font-semibold text-foreground">{longDateTime(event.starts_at)}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[12px] font-bold uppercase text-foreground-3">Lugar</p>
              <p className="mt-1 text-[15px] font-semibold text-foreground">
                {event.venue_name}
                {event.cities ? `, ${event.cities.name}` : ""}
              </p>
              {event.venue_address && <p className="text-[13px] text-foreground-3">{event.venue_address}</p>}
            </div>
          </Card>

          {reviews.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-[18px] font-extrabold text-foreground">Lo que dicen los asistentes</h2>
              {reviews.map((r) => (
                <Card key={r.id} className="space-y-1.5 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[13.5px] font-bold text-foreground">{r.author_name}</p>
                    <Stars value={r.rating} />
                  </div>
                  {r.comment && <p className="text-[14px] text-foreground-2">{r.comment}</p>}
                  {r.reply && (
                    <p className="border-l-2 border-pink pl-3 text-[13px] text-foreground-3">
                      <span className="font-bold text-foreground-2">Respuesta del organizador: </span>
                      {r.reply}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4 md:sticky md:top-6 md:self-start">
          <Card className="space-y-4 p-5">
            <h2 className="text-[16px] font-extrabold text-foreground">Entradas</h2>
            <ul className="space-y-2.5">
              {event.ticket_types.map((t) => {
                const st = saleState(t);
                return (
                  <li key={t.id} className="flex items-center justify-between gap-3 text-[14px]">
                    <div>
                      <p className="font-bold text-foreground">{t.name}</p>
                      {st === "upcoming" && t.sales_start && <p className="text-[12px] text-foreground-3">Abre el {shortDate(t.sales_start)}</p>}
                      {st === "on_sale" && t.sales_end && <p className="text-[12px] text-foreground-3">Hasta el {shortDate(t.sales_end)}</p>}
                    </div>
                    <span className="font-bold text-foreground">{st === "ended" ? "Terminó" : st === "sold_out" ? "Agotado" : t.price_cents === 0 ? "Gratis" : usd(t.price_cents)}</span>
                  </li>
                );
              })}
            </ul>
            <a
              href={`plann://evento/${event.id}`}
              className={`block rounded-full px-5 py-3 text-center text-[14px] font-bold ${open ? "bg-pink text-white hover:bg-[#d63873]" : "pointer-events-none bg-surface-muted text-foreground-3"}`}
            >
              {finished ? "Evento finalizado" : open ? "Comprar en la app de Plann" : "No hay entradas a la venta"}
            </a>
            <p className="text-center text-[12px] text-foreground-3">Las entradas se compran y se guardan en la app, con tu QR.</p>
          </Card>

          {org && (
            <Card className="p-5">
              <Link href={`/o/${org.slug}`} className="flex items-center gap-3">
                {org.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={org.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-soft text-[18px] font-extrabold text-pink">{org.name.slice(0, 1)}</div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-[14.5px] font-bold text-foreground hover:text-pink">{org.name}</p>
                  <p className="flex items-center gap-2 text-[12px] text-foreground-3">
                    {org.verification_status === "verificado" && <Badge tone="pink">Verificado</Badge>}
                    {followers} {followers === 1 ? "seguidor" : "seguidores"}
                  </p>
                </div>
              </Link>
            </Card>
          )}
        </aside>
      </div>
    </PublicShell>
  );
}
