"use client";

import { useActionState, useState } from "react";
import {
  addTicketTypeAction,
  cancelEventAction,
  deleteTicketTypeAction,
  saveTicketTypeAction,
  setSalesPausedAction,
} from "@/app/organizador/(panel)/actions";
import type { FormState } from "@/app/organizador/actions";
import { Button, Card, CardHeader } from "@/components/ui";
import { InfoTip } from "@/components/InfoTip";
import { Message } from "@/components/org/Forms";
import type { TicketTypeRow } from "@/lib/org/data";
import { isoToVeDay } from "@/lib/format";

const inputClass =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-foreground outline-none placeholder:text-foreground-4 focus:border-pink";

function TicketTypeCard({ t }: { t: TicketTypeRow }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveTicketTypeAction.bind(null, t.id), {});
  const canDelete = t.sold === 0 && t.reserved === 0;
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-border-strong bg-surface-muted p-4">
      <input name="name" defaultValue={t.name} className={inputClass} placeholder="Nombre de la entrada" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[12px] font-bold text-foreground-3">Precio USD</label>
          <input name="price" defaultValue={String(t.price_cents / 100)} inputMode="decimal" className={inputClass} />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-foreground-3">Cupo total <InfoTip text="Cuántas entradas de este tipo puedes vender en total. No puede ser menor a lo ya vendido o reservado." /></label>
          <input name="quantity" defaultValue={String(t.quantity)} inputMode="numeric" className={inputClass} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-foreground-3">Venta desde <InfoTip text="Día en que abre la venta de este tipo de entrada (preventas). Vacío = ya está abierta." /></label>
          <input name="start_day" type="date" defaultValue={isoToVeDay(t.sales_start)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-foreground-3">Venta hasta <InfoTip text="Último día en que se vende este tipo de entrada. Vacío = hasta agotar o hasta el evento." /></label>
          <input name="end_day" type="date" defaultValue={isoToVeDay(t.sales_end)} className={inputClass} />
        </div>
      </div>
      {t.price_cents > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-foreground-3">Oferta de última hora <InfoTip text="Descuento automático que se activa pocas horas antes del evento para llenar cupos que sobran. Tú absorbes la rebaja; avisamos a quienes vigilan el precio y a tus seguidores." /></label>
            <select name="lm_pct" defaultValue={String(t.last_minute_pct ?? "")} className={inputClass}>
              <option value="">Sin oferta</option>
              {[10, 20, 30, 50].map((p) => (
                <option key={p} value={p}>{p}% menos</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-foreground-3">Se activa desde <InfoTip text="Cuántas horas antes de que empiece el evento se aplica el descuento." /></label>
            <select name="lm_hours" defaultValue={String(t.last_minute_hours ?? 24)} className={inputClass}>
              {[6, 12, 24, 48].map((h) => (
                <option key={h} value={h}>{h} h antes del evento</option>
              ))}
            </select>
          </div>
        </div>
      )}
      <p className="text-[12px] text-foreground-3">
        {t.sold} vendidas{t.reserved > 0 ? ` · ${t.reserved} reservadas` : ""} · deja las fechas vacías para vender hasta agotar
      </p>
      <Message state={state} />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Guardar entrada"}
        </Button>
        {canDelete ? (
          <button type="submit" formAction={deleteTicketTypeAction.bind(null, t.id)} className="text-[12.5px] font-bold text-foreground-3 hover:text-danger">
            Eliminar
          </button>
        ) : (
          <span className="text-[12px] text-foreground-4">Ya tiene ventas: no se puede eliminar</span>
        )}
      </div>
    </form>
  );
}

function NewTicketType({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(addTicketTypeAction.bind(null, eventId), {});
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-full rounded-full border border-dashed border-border-strong py-2.5 text-[13px] font-bold text-foreground-2 hover:bg-surface-muted">
        Agregar otro tipo de entrada
      </button>
    );
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-pink/40 bg-pink-soft/30 p-4">
      <input name="name" placeholder="Nombre (ej. VIP)" className={inputClass} required />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="price" placeholder="Precio USD (vacío = gratis)" inputMode="decimal" className={inputClass} />
        <input name="quantity" placeholder="Cupo" inputMode="numeric" className={inputClass} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="start_day" type="date" className={inputClass} aria-label="Venta desde" />
        <input name="end_day" type="date" className={inputClass} aria-label="Venta hasta" />
      </div>
      <Message state={state} />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Agregando..." : "Agregar entrada"}
        </Button>
        <button type="button" onClick={() => setOpen(false)} className="text-[12.5px] font-bold text-foreground-3">
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function TicketTypesManager({ eventId, types }: { eventId: string; types: TicketTypeRow[] }) {
  return (
    <Card>
      <CardHeader title="Entradas" subtitle="Cambia precios y cupos cuando quieras; lo ya vendido no se altera." />
      <div className="space-y-3 p-5">
        {types.map((t) => (
          <TicketTypeCard key={t.id} t={t} />
        ))}
        <NewTicketType eventId={eventId} />
      </div>
    </Card>
  );
}

export function SalesControl({ eventId, paused }: { eventId: string; paused: boolean }) {
  return (
    <Card>
      <CardHeader title="Ventas" help="Pausar detiene las compras nuevas sin ocultar el evento. Úsalo si hay un problema o quieres cerrar la venta un rato; puedes reanudar cuando quieras." subtitle={paused ? "Las ventas están pausadas: el evento se ve, pero nadie puede comprar." : "Las ventas están abiertas."} />
      <div className="p-5">
        <form action={setSalesPausedAction.bind(null, eventId, !paused)}>
          <Button type="submit" variant="ghost">
            {paused ? "Reanudar ventas" : "Pausar ventas"}
          </Button>
        </form>
      </div>
    </Card>
  );
}

export function CancelEvent({ eventId, paidOrders }: { eventId: string; paidOrders: number }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(cancelEventAction.bind(null, eventId), {});
  return (
    <Card>
      <CardHeader title="Cancelar evento" />
      <div className="space-y-3 p-5">
        {!confirming ? (
          <>
            <p className="text-[13px] leading-relaxed text-foreground-3">
              Se cierra la venta, se anulan los tickets y los pagos confirmados quedan por reembolsar (salen de tu saldo). No se puede deshacer.
            </p>
            <Button type="button" variant="danger" onClick={() => setConfirming(true)}>
              Cancelar este evento
            </Button>
          </>
        ) : (
          <form action={action} className="space-y-3">
            <p className="text-[13.5px] font-bold text-foreground">
              {paidOrders > 0 ? `Vas a reembolsar ${paidOrders} ${paidOrders === 1 ? "compra" : "compras"}.` : "Nadie ha comprado todavía."}
            </p>
            <label className="block text-[12.5px] font-bold text-foreground-2">Motivo que verán tus compradores</label>
            <input name="reason" required minLength={5} placeholder="Ej. Lluvia fuerte en la zona" className={inputClass} />
            <Message state={state} />
            <div className="flex items-center gap-3">
              <Button type="submit" variant="danger" disabled={pending}>
                {pending ? "Cancelando..." : "Sí, cancelar evento"}
              </Button>
              <button type="button" onClick={() => setConfirming(false)} className="text-[12.5px] font-bold text-foreground-3">
                Mejor no
              </button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}
