"use client";

import { useActionState, useState } from "react";
import { replyReviewAction } from "@/app/organizador/(panel)/actions";
import type { FormState } from "@/app/organizador/actions";
import { Button } from "@/components/ui";
import { Message } from "@/components/org/Forms";

export function ReviewReply({ reviewId, existing }: { reviewId: string; existing: string | null }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(replyReviewAction.bind(null, reviewId), {});
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-[12.5px] font-bold text-pink">
        {existing ? "Editar respuesta" : "Responder"}
      </button>
    );
  return (
    <form action={action} className="space-y-2">
      <textarea name="reply" required minLength={2} maxLength={500} rows={2} defaultValue={existing ?? ""} placeholder="Agradece o aclara. Tu respuesta es pública." className="w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-[13.5px] outline-none focus:border-pink" />
      <Message state={state} />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando..." : "Publicar respuesta"}
        </Button>
        <button type="button" onClick={() => setOpen(false)} className="text-[12.5px] font-bold text-foreground-3">
          Cerrar
        </button>
      </div>
    </form>
  );
}
