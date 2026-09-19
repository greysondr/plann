import React, { useEffect } from "react";
import { Tabs } from "expo-router";
import { setLastMode } from "../../../src/lib/mode";
import { OrganizerTabBar } from "../../../src/components/OrganizerTabBar";

// Navegación fija del modo organizador: Resumen, Eventos, Escanear, Ventas, Más.
export default function OrganizerPanelLayout() {
  useEffect(() => {
    setLastMode("organizer");
  }, []);
  return (
    <Tabs tabBar={(props) => <OrganizerTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "transparent" } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="eventos" />
      <Tabs.Screen name="ventas" />
      <Tabs.Screen name="mas" />
    </Tabs>
  );
}
