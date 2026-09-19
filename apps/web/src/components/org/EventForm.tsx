"use client";

import { useActionState, useMemo, useState } from "react";
import { createEventAction, updateEventAction } from "@/app/organizador/(panel)/actions";
import type { FormState } from "@/app/organizador/actions";
import { Button } from "@/components/ui";
import { Message } from "@/components/org/Forms";
import { longDateTime } from "@/lib/format";

export interface Option {
  id: string;
  name: string;
}

interface Draft {
  key: number;
  name: string;
  price: string;
  quantity: string;
  startDay: string;
  endDay: string;
}

const inputClass =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-foreground outline-none placeholder:text-foreground-4 focus:border-pink";
const labelClass = "mb-1.5 block text-[12.5px] font-bold text-foreground-2";
const PRESETS = ["General", "VIP", "Preventa"];

// Hora de Venezuela (UTC-4) para el datetime-local del formulario.
export function toVeInput(iso: string): string {
  return new Date(new Date(iso).getTime() - 4 * 3600 * 1000).toISOString().slice(0, 16);
}

const MAX_PHOTOS = 5;

// Galería del evento: hasta 5 fotos 16:9; la primera es la portada. Las que ya están guardadas se
// conservan (y se pueden reordenar o quitar); las nuevas se eligen de una vez con el selector.
function PhotosField({ initial }: { initial: string[] }) {
  const [existing, setExisting] = useState<string[]>(initial);
  const [previews, setPreviews] = useState<{ url: string; note: string; ok: boolean }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const room = MAX_PHOTOS - existing.length;

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setError(null);
    setPreviews([]);
    if (files.length === 0) return;
    if (files.length > room) {
      setError(`Solo caben ${room} foto${room === 1 ? "" : "s"} más (máximo ${MAX_PHOTOS}).`);
      e.target.value = "";
      return;
    }
    if (files.some((f) => f.size > 5 * 1024 * 1024)) {
      setError("Alguna foto pesa más de 5 MB. Usa fotos más livianas.");
      e.target.value = "";
      return;
    }
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        const small = img.width < 1600 || img.height < 900;
        const off = Math.abs(ratio - 16 / 9) > 0.15;
        const note = small ? `${img.width} × ${img.height}: se verá borrosa` : off ? "No es 16:9: se recorta al centro" : `${img.width} × ${img.height} · ideal`;
        setPreviews((p) => [...p, { url, note, ok: !small && !off }]);
      };
      img.src = url;
    });
  }

  function makeCover(i: number) {
    setExisting((list) => [list[i], ...list.filter((_, j) => j !== i)]);
  }

  return (
    <div>
      <label className={labelClass}>Fotos del evento</label>
      <input type="hidden" name="existing_images" value={JSON.stringify(existing)} />
      <div className="flex flex-wrap gap-3">
        {existing.map((url, i) => (
          <div key={url} className="w-[190px]">
            <div className="relative aspect-video overflow-hidden rounded-xl border border-border-strong bg-surface-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-pink px-2 py-0.5 text-[10.5px] font-bold text-white">Portada</span>}
            </div>
            <div className="mt-1.5 flex gap-3 text-[12px] font-bold">
              {i > 0 && (
                <button type="button" onClick={() => makeCover(i)} className="text-pink">
                  Hacer portada
                </button>
              )}
              <button type="button" onClick={() => setExisting((l) => l.filter((_, j) => j !== i))} className="text-foreground-3 hover:text-danger">
                Quitar
              </button>
            </div>
          </div>
        ))}
        {previews.map((p) => (
          <div key={p.url} className="w-[190px]">
            <div className="relative aspect-video overflow-hidden rounded-xl border border-pink/50 bg-surface-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="Foto nueva" className="h-full w-full object-cover" />
              <span className="absolute left-2 top-2 rounded-full bg-foreground px-2 py-0.5 text-[10.5px] font-bold text-white">Nueva</span>
            </div>
            <p className={`mt-1.5 text-[11.5px] font-semibold ${p.ok ? "text-success-ink" : "text-warning"}`}>{p.note}</p>
          </div>
        ))}
        {existing.length === 0 && previews.length === 0 && (
          <div className="flex aspect-video w-[190px] items-center justify-center rounded-xl border border-dashed border-border-strong text-[12.5px] text-foreground-3">Sin fotos todavía</div>
        )}
      </div>
      <div className="mt-3 space-y-1.5">
        <input
          name="images"
          type="file"
          multiple
          disabled={room <= 0}
          accept="image/jpeg,image/png,image/webp"
          onChange={onFiles}
          className="block w-full text-[13px] text-foreground-2 file:mr-3 file:rounded-full file:border-0 file:bg-pink-soft file:px-4 file:py-2 file:text-[13px] file:font-bold file:text-pink disabled:opacity-50"
        />
        {error && <p className="text-[12.5px] font-semibold text-danger">{error}</p>}
        <p className="text-[12px] leading-relaxed text-foreground-3">
          Hasta {MAX_PHOTOS} fotos horizontales de <span className="font-bold">1600 × 900 px</span> (16:9), JPG, PNG o WebP, máx. 5 MB cada una. La portada es la primera: es la que se ve en Buscar y en las tarjetas.
        </p>
      </div>
    </div>
  );
}

function TicketsBuilder({ drafts, setDrafts }: { drafts: Draft[]; setDrafts: (d: Draft[]) => void }) {
  const set = (key: number, patch: Partial<Draft>) => setDrafts(drafts.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  return (
    <div className="space-y-3">
      <label className={labelClass}>Entradas</label>
      {drafts.map((d) => (
        <div key={d.key} className="space-y-3 rounded-2xl border border-border-strong bg-surface-muted p-4">
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => set(d.key, { name: p })}
                className={`rounded-full border px-3 py-1 text-[12.5px] font-bold ${d.name === p ? "border-pink bg-pink text-white" : "border-border-strong text-foreground-2"}`}
              >
                {p}
              </button>
            ))}
            {drafts.length > 1 && (
              <button type="button" onClick={() => setDrafts(drafts.filter((x) => x.key !== d.key))} className="ml-auto text-[12.5px] font-bold text-foreground-3 hover:text-danger">
                Quitar
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
            <input value={d.name} onChange={(e) => set(d.key, { name: e.target.value })} placeholder="Nombre de la entrada" className={inputClass} />
            <input value={d.price} onChange={(e) => set(d.key, { price: e.target.value })} placeholder="Precio USD (vacío = gratis)" inputMode="decimal" className={inputClass} />
            <input value={d.quantity} onChange={(e) => set(d.key, { quantity: e.target.value })} placeholder="Cupo" inputMode="numeric" className={inputClass} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[12px] font-bold text-foreground-3">Venta desde (opcional)</label>
              <input type="date" value={d.startDay} onChange={(e) => set(d.key, { startDay: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-bold text-foreground-3">Venta hasta (opcional)</label>
              <input type="date" value={d.endDay} min={d.startDay || undefined} onChange={(e) => set(d.key, { endDay: e.target.value })} className={inputClass} />
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setDrafts([...drafts, { key: Math.max(0, ...drafts.map((d) => d.key)) + 1, name: PRESETS.find((p) => !drafts.some((d) => d.name === p)) ?? "", price: "", quantity: "", startDay: "", endDay: "" }])}
        className="w-full rounded-full border border-dashed border-border-strong py-2.5 text-[13px] font-bold text-foreground-2 hover:bg-surface-muted"
      >
        Agregar otro tipo de entrada
      </button>
    </div>
  );
}

export function EventForm({
  mode,
  categories,
  cities,
  event,
}: {
  mode: "create" | "edit";
  categories: Option[];
  cities: Option[];
  event?: { id: string; title: string; description: string | null; venue_name: string | null; starts_at: string; publish_at?: string | null; status?: string; images?: string[]; category_id: string | null; city_id: string | null; is_community?: boolean };
}) {
  const action = mode === "create" ? createEventAction : updateEventAction.bind(null, event!.id);
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const [drafts, setDrafts] = useState<Draft[]>([{ key: 1, name: "General", price: "", quantity: "", startDay: "", endDay: "" }]);
  const [title, setTitle] = useState(event?.title ?? "");
  const [startsAt, setStartsAt] = useState(event ? toVeInput(event.starts_at) : "");

  const ticketsJson = useMemo(
    () =>
      JSON.stringify(
        drafts.map((d) => ({
          name: d.name,
          priceCents: d.price.trim() === "" ? 0 : Math.round(parseFloat(d.price.replace(",", ".")) * 100),
          quantity: parseInt(d.quantity, 10),
          startDay: d.startDay,
          endDay: d.endDay,
        }))
      ),
    [drafts]
  );

  return (
    <form action={formAction} className="space-y-6">
      <PhotosField initial={event?.images ?? []} />

      <div>
        <label className={labelClass}>Nombre del evento</label>
        <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ej. Noche de trivia en el centro" className={inputClass} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>Categoría</label>
          <select name="category_id" defaultValue={event?.category_id ?? ""} className={inputClass}>
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Ciudad</label>
          <select name="city_id" defaultValue={event?.city_id ?? cities.find((c) => c.name === "Barquisimeto")?.id ?? ""} className={inputClass}>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr_1.2fr_0.8fr]">
        <div>
          <label className={labelClass}>Lugar</label>
          <input name="venue_name" defaultValue={event?.venue_name ?? ""} required placeholder="Ej. Plaza El Obelisco" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Fecha y hora (hora de Venezuela)</label>
          <input name="starts_at" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required className={inputClass} />
        </div>
        {mode === "create" && (
          <div>
            <label className={labelClass}>Duración (horas)</label>
            <input name="duration_hours" type="number" min={1} max={24} defaultValue={3} className={inputClass} />
          </div>
        )}
      </div>

      {(mode === "create" || event?.status === "draft") && (
        <div>
          <label className={labelClass}>Publicación (hora de Venezuela)</label>
          <input name="publish_at" type="datetime-local" defaultValue={event?.publish_at ? toVeInput(event.publish_at) : ""} className={inputClass} />
          <p className="mt-1.5 text-[12px] text-foreground-3">Déjalo vacío para publicar ahora. Si eliges una fecha, queda como borrador y se publica solo a esa hora.</p>
        </div>
      )}

      <div>
        <label className={labelClass}>Descripción</label>
        <textarea name="description" defaultValue={event?.description ?? ""} rows={4} placeholder="Cuéntale a la gente qué va a encontrar en tu evento" className={inputClass} />
      </div>

      <label className="flex items-start gap-3 text-[13.5px] text-foreground-2">
        <input name="is_community" type="checkbox" defaultChecked={event?.is_community ?? false} className="mt-1 h-4 w-4 accent-pink" />
        <span>
          <b className="text-foreground">Evento comunitario</b>: feria, deporte, cultura o encuentro sin fines de lucro. Sale en «Gratis y comunitarios» de la portada.
        </span>
      </label>

      {mode === "create" && (
        <>
          <TicketsBuilder drafts={drafts} setDrafts={setDrafts} />
          <input type="hidden" name="tickets" value={ticketsJson} />
        </>
      )}

      <div className="rounded-2xl border border-border bg-surface-muted p-4 text-[12.5px] text-foreground-3">
        <span className="font-bold text-foreground-2">Vista rápida: </span>
        {title || "Tu evento"}
        {startsAt ? ` · ${longDateTime(new Date(`${startsAt}:00-04:00`).toISOString())}` : ""}
      </div>

      <Message state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : mode === "create" ? "Publicar evento" : "Guardar cambios"}
      </Button>
    </form>
  );
}
