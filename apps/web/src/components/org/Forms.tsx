"use client";

import { useActionState } from "react";
import { signIn, applyAsOrganizer, type FormState } from "@/app/organizador/actions";
import { Button } from "@/components/ui";

const inputClass =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-foreground outline-none placeholder:text-foreground-4 focus:border-pink";

export function Message({ state }: { state: FormState }) {
  if (state.error) return <p className="text-[13px] font-semibold text-danger">{state.error}</p>;
  if (state.ok) return <p className="text-[13px] font-semibold text-success-ink">{state.ok}</p>;
  return null;
}

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {});
  return (
    <form action={action} className="space-y-3">
      <input name="email" type="email" placeholder="Correo" autoComplete="email" required className={inputClass} />
      <input name="password" type="password" placeholder="Contraseña" autoComplete="current-password" required className={inputClass} />
      <Message state={state} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}

export function ApplyForm({ defaultName = "", defaultDocument = "", label }: { defaultName?: string; defaultDocument?: string; label: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(applyAsOrganizer, {});
  return (
    <form action={action} className="space-y-3">
      <input name="name" defaultValue={defaultName} placeholder="Nombre de tu negocio o nombre legal" required className={inputClass} />
      <input name="document" defaultValue={defaultDocument} placeholder="Cédula o RIF" required className={inputClass} />
      <Message state={state} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Enviando..." : label}
      </Button>
    </form>
  );
}
