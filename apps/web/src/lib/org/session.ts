import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export interface OrganizerRow {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  verification_status: "pendiente" | "verificado" | "rechazado" | "suspendido";
  rejection_reason: string | null;
  plan: "basico" | "pro" | "business";
  commission_rate: number;
  payout_method: "pago_movil" | "transfer" | "zelle" | null;
  payout_account: string | null;
  legal_document: string | null;
}

export type OrgRole = "owner" | "editor" | "finance";

// Lo que cada rol puede hacer en el panel. La base de datos hace cumplir esto; aquí solo se
// decide qué mostrar y a dónde mandar a quien entra a una página que no le corresponde.
export const can = {
  manage: (role: OrgRole) => role === "owner" || role === "editor", // eventos, entradas, cupones, cortesías, mensajes
  money: (role: OrgRole) => role === "owner" || role === "finance", // saldo, retiros
  owner: (role: OrgRole) => role === "owner", // equipo, perfil, reembolsos, cancelar
};

export const getOrganizerContext = cache(async () => {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  // my_workspace() = organizador + rol de quien inicia sesión. El dueño recibe su fila completa; el
  // equipo la recibe sin cédula, cuenta de cobro ni motivo de rechazo.
  const { data } = await supabase.rpc("my_workspace");
  const ws = data as { role: OrgRole; organizer: OrganizerRow } | null;
  return { user, organizer: ws?.organizer ?? null, role: (ws?.role ?? null) as OrgRole | null };
});

// Para páginas dentro del panel: el layout ya garantizó que existe y está verificado.
export async function requireOrganizer() {
  const ctx = await getOrganizerContext();
  if (!ctx || !ctx.organizer || !ctx.role || ctx.organizer.verification_status !== "verificado") {
    throw new Error("Organizador no verificado");
  }
  return { user: ctx.user, organizer: ctx.organizer, role: ctx.role };
}

// Igual que requireOrganizer pero manda al dashboard a quien no tiene el permiso.
export async function requireRole(check: (role: OrgRole) => boolean) {
  const ctx = await requireOrganizer();
  if (!check(ctx.role)) redirect("/organizador");
  return ctx;
}
