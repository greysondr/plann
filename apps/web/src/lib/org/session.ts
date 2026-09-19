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

const ORGANIZER_COLUMNS =
  "id, name, slug, bio, contact_phone, logo_url, verification_status, rejection_reason, plan, commission_rate, payout_method, payout_account, legal_document";

export const getOrganizerContext = cache(async () => {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("organizers").select(ORGANIZER_COLUMNS).eq("owner_user_id", user.id).maybeSingle();
  return { user, organizer: (data as OrganizerRow | null) ?? null };
});

// Para páginas dentro del panel: el layout ya garantizó que existe y está verificado.
export async function requireOrganizer() {
  const ctx = await getOrganizerContext();
  if (!ctx || !ctx.organizer || ctx.organizer.verification_status !== "verificado") {
    throw new Error("Organizador no verificado");
  }
  return { user: ctx.user, organizer: ctx.organizer };
}
