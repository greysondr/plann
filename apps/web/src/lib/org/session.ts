import "server-only";
import { cache } from "react";
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

export const getOrganizerContext = cache(async () => {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  // my_organizer() devuelve la fila completa solo a su dueño (cédula, cuenta de cobro, comisión).
  const { data } = await supabase.rpc("my_organizer");
  const organizer = ((data as OrganizerRow[] | null) ?? [])[0] ?? null;
  return { user, organizer };
});

// Para páginas dentro del panel: el layout ya garantizó que existe y está verificado.
export async function requireOrganizer() {
  const ctx = await getOrganizerContext();
  if (!ctx || !ctx.organizer || ctx.organizer.verification_status !== "verificado") {
    throw new Error("Organizador no verificado");
  }
  return { user: ctx.user, organizer: ctx.organizer };
}
