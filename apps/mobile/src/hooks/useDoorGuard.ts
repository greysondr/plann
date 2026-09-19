import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAppStore, useEvent } from "../context/AppStore";

// Escanear entradas: el organizador verificado (dueño del evento) o el personal
// de puerta que ese organizador agregó. Sin evento, solo el organizador.
export function useDoorGuard(eventId?: string): boolean {
  const router = useRouter();
  const { loading, organizerStatus, myOrganizerId, staffAssignments } = useAppStore();
  const event = useEvent(eventId);

  const isOwner = organizerStatus === "verified" && (!event || event.organizerId === myOrganizerId);
  const isStaff = !!event && staffAssignments.some((a) => a.organizerId === event.organizerId);
  const allowed = isOwner || isStaff;

  useEffect(() => {
    if (loading) return;
    if (!allowed) router.replace(organizerStatus === "verified" ? "/organizador" : "/");
  }, [loading, allowed, organizerStatus, router]);

  return !loading && allowed;
}
