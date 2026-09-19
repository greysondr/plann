"use client";

import { useActionState } from "react";
import { createSupportTicketAction, replySupportAction } from "@/app/organizador/(panel)/actions";
import type { FormState } from "@/app/organizador/actions";
import { Button } from "@/components/ui";
import { Message } from "@/components/org/Forms";
import { SUPPORT_CATEGORIES } from "@/lib/support";

const inputClass =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-foreground outline-none placeholder:text-foreground-4 focus:border-pink";

export function NewTicketForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createSupportTicketAction, {});
  return (
    <form action={action} className="space-y-3">
      <select name="category" className={inputClass} defaultValue="otro">
        {SUPPORT_CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <input name="subject" required minLength={4} maxLength={120} placeholder="Asunto" className={inputClass} />
      <textarea name="body" required minLength={10} maxLength={2000} rows={4} placeholder="Cuéntanos qué pasó, con el detalle que puedas (evento, monto, fecha)" className={inputClass} />
      <Message state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando..." : "Enviar consulta"}
      </Button>
    </form>
  );
}

export function ReplyForm({ ticketId }: { ticketId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(replySupportAction.bind(null, ticketId), {});
  return (
    <form action={action} className="space-y-3">
      <textarea name="body" required maxLength={2000} rows={3} placeholder="Escribe tu respuesta" className={inputClass} />
      <Message state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando..." : "Responder"}
      </Button>
    </form>
  );
}
