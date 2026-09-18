import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type PlannSupabaseClient = SupabaseClient<Database>;

/**
 * Cliente para usar desde la app (mobile/web) con la clave anónima.
 * Nunca pasar la service role key aquí: esa solo vive en Edge Functions.
 */
export function createPlannClient(url: string, anonKey: string): PlannSupabaseClient {
  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
