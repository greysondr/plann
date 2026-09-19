import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente sin sesión (anon key) para las páginas públicas: solo ve lo que RLS
// deja ver a cualquiera (eventos publicados, perfil público del organizador, reseñas).
export function supabasePublic() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
