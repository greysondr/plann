import "server-only";
import { createClient } from "@supabase/supabase-js";

// Solo se importa desde código de servidor: la service role salta RLS y jamás
// debe llegar al navegador. Falta: login real de admin antes de desplegar.
export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
