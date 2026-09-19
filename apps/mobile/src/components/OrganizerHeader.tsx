import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppStore } from "../context/AppStore";
import { setLastMode } from "../lib/mode";
import { color, fontFamily, spacing } from "../theme/tokens";

// Barra superior fija de las pantallas raíz del modo organizador: quién eres,
// en qué modo estás y cómo volver al modo comprador con un toque.
export function OrganizerHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { organizerProfile } = useAppStore();
  const name = organizerProfile?.name ?? "Tu negocio";

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 10 }]}>
      {organizerProfile?.logoUrl ? (
        <Image source={{ uri: organizerProfile.logoUrl }} style={styles.logo} />
      ) : (
        <View style={[styles.logo, styles.logoFallback]}>
          <Text style={styles.logoInitial}>{name.slice(0, 1).toUpperCase()}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.mode}>Modo organizador</Text>
      </View>
      <Pressable style={styles.switch} onPress={() => {
          setLastMode("buyer");
          router.replace("/");
        }} accessibilityRole="button" accessibilityLabel="Cambiar a modo comprador">
        <Text style={styles.switchText}>Modo comprador</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: spacing.screenX, paddingBottom: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 40, height: 40, borderRadius: 12 },
  logoFallback: { backgroundColor: "rgba(233,65,127,0.18)", alignItems: "center", justifyContent: "center" },
  logoInitial: { fontFamily: fontFamily.extraBold, fontSize: 17, color: color.pink },
  name: { fontFamily: fontFamily.extraBold, fontSize: 15.5, color: color.text },
  mode: { fontFamily: fontFamily.semiBold, fontSize: 11.5, color: color.pink, marginTop: 1 },
  switch: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  switchText: { fontFamily: fontFamily.bold, fontSize: 11.5, color: color.text2 },
});
