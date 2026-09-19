import Link from "next/link";
import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { can, requireRole } from "@/lib/org/session";
import { loadEvents } from "@/lib/org/data";
import { SITE_URL } from "@/lib/supabase/public";
import { longDateTime, usd } from "@/lib/format";
import { PrintButton } from "@/components/org/PrintButton";

export const dynamic = "force-dynamic";

export default async function PosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizer } = await requireRole(can.manage);
  const event = (await loadEvents(organizer.id)).find((e) => e.id === id);
  if (!event) notFound();
  const url = `${SITE_URL}/e/${event.slug}?src=afiche`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 640, color: { dark: "#151510", light: "#ffffff" } });
  const prices = event.ticket_types.map((t) => t.price_cents).filter((p) => p > 0);

  return (
    <div className="mx-auto max-w-[560px] space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/organizador/eventos/${event.id}`} className="text-[13px] font-bold text-foreground-3 hover:text-pink">
          ← Volver al evento
        </Link>
        <PrintButton label="Imprimir afiche" />
      </div>
      <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_1px_2px_rgba(21,21,16,0.04)]">
        <div className="aspect-video bg-surface-muted">
          {event.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.images[0]} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="space-y-2 px-8 pt-7">
          <p className="text-[12.5px] font-bold uppercase tracking-wide text-pink">{event.categories?.name ?? "Evento"}</p>
          <h1 className="text-[34px] font-extrabold leading-tight tracking-tight text-foreground">{event.title}</h1>
          <p className="text-[16px] font-semibold text-foreground-2">{longDateTime(event.starts_at)}</p>
          <p className="text-[15px] text-foreground-3">
            {event.venue_name}
            {event.cities ? `, ${event.cities.name}` : ""}
          </p>
          <p className="text-[18px] font-extrabold text-foreground">{prices.length ? `Entradas desde ${usd(Math.min(...prices))}` : "Entrada gratuita"}</p>
        </div>
        <div className="flex items-center gap-6 px-8 pb-8 pt-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR" className="h-[150px] w-[150px]" />
          <div>
            <p className="text-[18px] font-extrabold text-foreground">Escanea y compra en Plann</p>
            <p className="mt-1 text-[13px] text-foreground-3">Organiza {organizer.name}</p>
            <p className="mt-3 font-display text-[26px] leading-none text-foreground">plann</p>
          </div>
        </div>
      </div>
    </div>
  );
}
