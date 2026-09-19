"use client";

import { useActionState, useState } from "react";
import { addStaffAction, cancelStaffInviteAction, removeStaffAction, requestWithdrawalAction, updateProfileAction } from "@/app/organizador/(panel)/actions";
import type { FormState } from "@/app/organizador/actions";
import { Button } from "@/components/ui";
import { Message } from "@/components/org/Forms";

const inputClass =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-foreground outline-none placeholder:text-foreground-4 focus:border-pink";
const labelClass = "mb-1.5 block text-[12.5px] font-bold text-foreground-2";

const METHODS = [
  { id: "pago_movil", label: "Pago Móvil", hint: "Banco, teléfono y cédula" },
  { id: "transfer", label: "Transferencia", hint: "Banco, número de cuenta y titular" },
  { id: "zelle", label: "Zelle", hint: "Correo o teléfono de tu cuenta Zelle" },
];

export function WithdrawForm({ available, method, account }: { available: number; method: string | null; account: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(requestWithdrawalAction, {});
  const [m, setM] = useState(method ?? "pago_movil");
  const [amount, setAmount] = useState("");
  const tooLow = available < 500;
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className={labelClass}>Recibir por</label>
        <div className="flex flex-wrap gap-2">
          {METHODS.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setM(x.id)}
              className={`rounded-full border px-4 py-1.5 text-[13px] font-bold ${m === x.id ? "border-pink bg-pink text-white" : "border-border-strong text-foreground-2"}`}
            >
              {x.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="method" value={m} />
      </div>
      <div>
        <label className={labelClass}>Datos de la cuenta</label>
        <input name="account" defaultValue={account ?? ""} required placeholder={METHODS.find((x) => x.id === m)?.hint} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Monto en USD</label>
        <input name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="Mínimo $5,00" className={inputClass} />
        <button type="button" disabled={tooLow} onClick={() => setAmount((available / 100).toFixed(2))} className="mt-2 text-[12.5px] font-bold text-pink disabled:opacity-40">
          Retirar todo
        </button>
      </div>
      {tooLow && <p className="text-[12.5px] text-foreground-3">Puedes retirar cuando tengas al menos $5,00 disponibles.</p>}
      <Message state={state} />
      <Button type="submit" disabled={pending || tooLow}>
        {pending ? "Enviando..." : "Solicitar retiro"}
      </Button>
    </form>
  );
}

const ROLES = [
  { id: "door", label: "Puerta", hint: "Solo valida entradas en la app" },
  { id: "editor", label: "Editor", hint: "Gestiona eventos, entradas, cupones y mensajes. No ve retiros ni cuentas de cobro" },
  { id: "finance", label: "Finanzas", hint: "Solo lectura: ventas, saldo, retiros y reportes" },
];

export function StaffForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addStaffAction, {});
  const [role, setRole] = useState("door");
  return (
    <form action={action} className="space-y-3">
      <input name="email" type="email" required placeholder="Correo de la persona" className={inputClass} />
      <div className="flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <button key={r.id} type="button" onClick={() => setRole(r.id)} className={`rounded-full border px-4 py-1.5 text-[13px] font-bold ${role === r.id ? "border-pink bg-pink text-white" : "border-border-strong text-foreground-2"}`}>
            {r.label}
          </button>
        ))}
      </div>
      <input type="hidden" name="role" value={role} />
      <p className="text-[12.5px] text-foreground-3">{ROLES.find((r) => r.id === role)?.hint}</p>
      <Message state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Agregando..." : "Agregar al equipo"}
      </Button>
    </form>
  );
}

export function RemoveStaff({ id }: { id: string }) {
  return (
    <form action={removeStaffAction.bind(null, id)}>
      <button type="submit" className="text-[12.5px] font-bold text-foreground-3 hover:text-danger">
        Quitar
      </button>
    </form>
  );
}

export function ProfileForm({
  organizer,
}: {
  organizer: { name: string; bio: string | null; contact_phone: string | null; logo_url: string | null; payout_method: string | null; payout_account: string | null};
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfileAction, {});
  const [m, setM] = useState(organizer.payout_method ?? "pago_movil");
  return (
    <form action={action} className="space-y-5">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {organizer.logo_url ? <img src={organizer.logo_url} alt="Logo" className="h-16 w-16 rounded-2xl object-cover ring-1 ring-border" /> : <div className="h-16 w-16 rounded-2xl bg-surface-muted ring-1 ring-border" />}
        <div>
          <label className={labelClass}>Logo (cuadrado, JPG/PNG/WebP, máx. 5 MB)</label>
          <input name="logo" type="file" accept="image/jpeg,image/png,image/webp" className="block text-[13px] text-foreground-2 file:mr-3 file:rounded-full file:border-0 file:bg-pink-soft file:px-4 file:py-2 file:text-[13px] file:font-bold file:text-pink" />
        </div>
      </div>
      <div>
        <label className={labelClass}>Nombre del negocio</label>
        <input name="name" defaultValue={organizer.name} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Descripción pública</label>
        <textarea name="bio" defaultValue={organizer.bio ?? ""} rows={3} placeholder="Cuéntale a la gente quién eres y qué organizas" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Teléfono de contacto</label>
        <input name="contact_phone" defaultValue={organizer.contact_phone ?? ""} placeholder="0414-0000000" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Cuenta para recibir tus pagos</label>
        <div className="mb-2 flex flex-wrap gap-2">
          {METHODS.map((x) => (
            <button key={x.id} type="button" onClick={() => setM(x.id)} className={`rounded-full border px-4 py-1.5 text-[13px] font-bold ${m === x.id ? "border-pink bg-pink text-white" : "border-border-strong text-foreground-2"}`}>
              {x.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="payout_method" value={m} />
        <input name="payout_account" defaultValue={organizer.payout_account ?? ""} placeholder={METHODS.find((x) => x.id === m)?.hint} className={inputClass} />
      </div>
      <Message state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar perfil"}
      </Button>
    </form>
  );
}

export function CancelInvite({ id }: { id: string }) {
  return (
    <form action={cancelStaffInviteAction.bind(null, id)}>
      <button type="submit" className="text-[12.5px] font-bold text-foreground-3 hover:text-danger">
        Cancelar invitación
      </button>
    </form>
  );
}
