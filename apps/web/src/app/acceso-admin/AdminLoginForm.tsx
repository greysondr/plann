"use client";

import { useActionState } from "react";
import { adminSignIn } from "./actions";
import type { FormState } from "@/app/organizador/actions";
import { Button } from "@/components/ui";

const inputClass =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-foreground outline-none placeholder:text-foreground-4 focus:border-pink";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(adminSignIn, {});
  return (
    <form action={action} className="space-y-3">
      <input name="email" type="email" placeholder="Correo" autoComplete="username" className={inputClass} />
      <input name="password" type="password" placeholder="Contraseña" autoComplete="current-password" className={inputClass} />
      {state.error && <p className="text-[13px] font-semibold text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
