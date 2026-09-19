import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente con la sesión de quien está navegando (anon key + cookies): todo lo
// que se lea o escriba pasa por RLS y por las funciones de Postgres, igual
// que en la app móvil. Nunca usa la service role.
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component: el refresco de sesión lo hace proxy.ts.
        }
      },
    },
  });
}
