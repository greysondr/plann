import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAppStore } from "../context/AppStore";

// Ninguna pantalla de organizador debe poder abrirse sin pasar por la
// verificación (antes se podía entrar directo por navegación/deep link y
// cualquiera veía el panel de organizador). Devuelve true solo cuando ya está
// verificado; mientras tanto redirige a la pantalla de activación.
export function useOrganizerGuard(): boolean {
  const router = useRouter();
  const { organizerStatus, loading } = useAppStore();

  useEffect(() => {
    if (!loading && organizerStatus !== "verified") {
      router.replace("/organizador/activar");
    }
  }, [loading, organizerStatus, router]);

  return !loading && organizerStatus === "verified";
}
