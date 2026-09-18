import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, fontFamily } from "../../src/theme/tokens";
import { HomeIcon, SearchIcon, TicketIcon, ProfileIcon } from "../../src/components/icons";

const TABS: Record<string, { label: string; Icon: typeof HomeIcon }> = {
  index: { label: "Inicio", Icon: HomeIcon },
  buscar: { label: "Buscar", Icon: SearchIcon },
  tickets: { label: "Tickets", Icon: TicketIcon },
  perfil: { label: "Perfil", Icon: ProfileIcon },
};

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    // Nota: expo-blur se ve con un halo/ghosting en el Simulador de iOS (limitación
    // conocida de BlurView ahí); en dispositivo real el vidrio se ve nítido.
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 14) }]}>
      <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.tint} />
      <View style={styles.row}>
        {state.routes.map((route: any, index: number) => {
          const meta = TABS[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          const { Icon, label } = meta;
          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={styles.item}
              accessibilityRole="button"
              accessibilityLabel={label}
            >
              <Icon active={focused} />
              <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "transparent" } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="buscar" />
      <Tabs.Screen name="tickets" />
      <Tabs.Screen name="perfil" />
    </Tabs>
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
  tint: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  row: {
    flexDirection: "row",
    paddingTop: 10,
  },
  item: {
    flex: 1,
    minWidth: 56,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: 10,
    color: color.iconOff,
  },
  labelActive: {
    fontFamily: fontFamily.bold,
    color: color.pink,
  },
});
