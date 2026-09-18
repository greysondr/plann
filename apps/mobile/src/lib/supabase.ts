import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("Falta EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY (ver apps/mobile/.env)");
}

// Sin el tipo Database generado (packages/db): importarlo cruzaría fuera de
// apps/mobile y Metro no sigue archivos fuera de su raíz sin configurar
// watchFolders (ver docs/decisiones — ya hubo problemas de Metro con rutas
// del monorepo). Los tipos de cada tabla se definen donde se usan.
export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
