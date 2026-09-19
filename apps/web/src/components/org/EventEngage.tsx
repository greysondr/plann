"use client";

import { useActionState } from "react";
import { createCouponAction, issueCompAction, sendAnnouncementAction } from "@/app/organizador/(panel)/actions";
import type { FormState } from "@/app/organizador/actions";
import { Button } from "@/components/ui";
import { Message } from "@/components/org/Forms";

const inputClass =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-foreground outline-none placeholder:text-foreground-4 focus:border-pink";
const labelClass = "mb-1.5 block text-[12.5px] font-bold text-foreground-2";

export function CouponForm({ events }: { events: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createCouponAction, {});
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <div>
        <label className={labelClass}>Código</label>
        <input name="code" required placeholder="Ej. AMIGOS20" autoCapitalize="characters" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Aplica a</label>
        <select name="event_id" className={inputClass}>
          <option value="">Todos mis eventos</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Tipo de descuento</label>
        <select name="type" className={inputClass} defaultValue="percent">
          <option value="percent">Porcentaje (%)</option>
          <option value="fixed">Monto fijo (USD)</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Valor</label>
        <input name="value" required inputMode="decimal" placeholder="20" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Usos máximos (opcional)</label>
        <input name="max_uses" inputMode="numeric" placeholder="Sin límite" className={inputClass} />
      </div>
      <div className="flex items-end">
        <p className="text-[12.5px] text-foreground-3">Cada persona puede usarlo una vez. El descuento lo absorbes tú.</p>
      </div>
      <div className="md:col-span-2">
        <Message state={state} />
        <Button type="submit" disabled={pending} className="mt-2">
          {pending ? "Creando..." : "Crear cupón"}
        </Button>
      </div>
    </form>
  );
}

export function CompForm({ eventId, types }: { eventId: string; types: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(issueCompAction.bind(null, eventId), {});
  return (
    <form action={action} className="space-y-3">
      <p className="text-[12.5px] leading-relaxed text-foreground-3">
        Regala entradas a alguien que ya tiene cuenta en Plann. No pagan, no cuentan como venta y no dan puntos.
      </p>
      <input name="email" type="email" required placeholder="Correo de tu invitado" className={inputClass} />
      <div className="grid gap-3 sm:grid-cols-3">
        <select name="ticket_type_id" className={inputClass}>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input name="quantity" type="number" min={1} max={6} defaultValue={1} className={inputClass} />
        <input name="note" placeholder="Nota (ej. Prensa)" className={inputClass} />
      </div>
      <Message state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando..." : "Enviar cortesía"}
      </Button>
    </form>
  );
}

export function AnnouncementForm({ eventId, recipients }: { eventId: string; recipients: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendAnnouncementAction.bind(null, eventId), {});
  return (
    <form action={action} className="space-y-3">
      <p className="text-[12.5px] leading-relaxed text-foreground-3">
        Le llega una notificación a cada persona con entrada. Máximo 3 mensajes por evento al día.
      </p>
      <textarea name="message" required minLength={5} maxLength={500} rows={3} placeholder="Ej. Cambiamos el punto de encuentro a la puerta norte" className={inputClass} />
      <Message state={state} />
      <Button type="submit" disabled={pending || recipients === 0}>
        {pending ? "Enviando..." : `Enviar a ${recipients} ${recipients === 1 ? "persona" : "personas"}`}
      </Button>
    </form>
  );
}
