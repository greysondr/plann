import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarIcon, DashboardIcon, MenuIcon, ReceiptIcon, ScanIcon } from "./icons";
import { color, fontFamily } from "../theme/tokens";

const TABS: Record<string, { label: string; Icon: typeof DashboardIcon }> = {
  index: { label: "Resumen", Icon: DashboardIcon },
  eventos: { label: "Eventos", Icon: CalendarIcon },
  ventas: { label: "Ventas", Icon: ReceiptIcon },
  mas: { label: "Más", Icon: MenuIcon },
};

// Barra inferior del modo organizador. El botón central escanea entradas:
// es lo que más se usa el día del evento y debe estar a un toque.
export function OrganizerTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const routes: { name: string; index: number; key: string }[] = state.routes.map((r: any, i: number) => ({ name: r.name, index: i, key: r.key }));
  const byName = (n: string) => routes.find((r) => r.name === n);
  const left = ["index", "eventos"].map(byName).filter(Boolean) as typeof routes;
  const right = ["ventas", "mas"].map(byName).filter(Boolean) as typeof routes;

  const renderTab = (route: (typeof routes)[number]) => {
    const meta = TABS[route.name];
    const focused = state.index === route.index;
    const { Icon, label } = meta;
    return (
      <Pressable key={route.key} onPress={() => navigation.navigate(route.name)} style={styles.item} accessibilityRole="button" accessibilityLabel={label}>
        <Icon active={focused} />
        <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 14) }]}>
      <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.tint} />
      <View style={styles.row}>
        {left.map(renderTab)}
        <View style={styles.item}>
          <Pressable style={styles.scan} onPress={() => router.push("/organizador/escanear")} accessibilityRole="button" accessibilityLabel="Escanear entradas">
            <ScanIcon size={26} tintColor={color.white} />
          </Pressable>
          <Text style={styles.label}>Escanear</Text>
        </View>
        {right.map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  tint: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.05)" },
  row: { flexDirection: "row", paddingTop: 10, alignItems: "flex-end" },
  item: { flex: 1, minWidth: 56, minHeight: 44, alignItems: "center", justifyContent: "center", gap: 4 },
  scan: {
    width: 52,
    height: 52,
    marginTop: -22,
    borderRadius: 26,
    backgroundColor: color.pink,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: color.pink,
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  label: { fontFamily: fontFamily.semiBold, fontSize: 10, color: color.iconOff },
  labelActive: { fontFamily: fontFamily.bold, color: color.pink },
});
