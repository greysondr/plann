import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../src/components/GlassCard";
import { ChevronRight, ScanIcon } from "../src/components/icons";
import { useAppStore } from "../src/context/AppStore";
import { formatEventDate } from "../src/utils/format";
import { color, fontFamily, spacing } from "../src/theme/tokens";

// Vista del personal de puerta: solo los eventos próximos de los organizadores
// que lo agregaron, con acceso directo al escáner. Nada de ventas ni compradores.
export default function PuertaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { events, staffAssignments } = useAppStore();

  const assignedIds = useMemo(() => new Set(staffAssignments.map((a) => a.organizerId)), [staffAssignments]);
  const upcoming = useMemo(() => {
    const cutoff = Date.now() - 12 * 3600 * 1000; // el evento de anoche todavía puede tener gente entrando
    return events
      .filter((e) => assignedIds.has(e.organizerId) && e.status !== "cancelled" && new Date(e.startsAt).getTime() >= cutoff)
      .sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1));
  }, [events, assignedIds]);

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 60 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ChevronRight color={color.text} />
          </View>
        </Pressable>
        <Text style={styles.title}>Modo puerta</Text>
        <View style={{ width: 18 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.intro}>
          Trabajas en la puerta de {staffAssignments.map((a) => a.organizerName).join(", ") || "un organizador"}. Elige el evento y escanea los QR.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={{ gap: 12 }}>
          {upcoming.length === 0 && <Text style={styles.hint}>No hay eventos próximos para validar.</Text>}
          {upcoming.map((event) => (
            <GlassCard key={event.id} level="card">
              <Pressable style={styles.row} onPress={() => router.push(`/organizador/escanear?eventId=${event.id}`)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text style={styles.hint}>{formatEventDate(event.startsAt)}</Text>
                </View>
                <ScanIcon size={22} />
              </Pressable>
            </GlassCard>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.screenX,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  title: { fontFamily: fontFamily.extraBold, fontSize: 18, color: color.text },
  section: { paddingHorizontal: spacing.screenX, marginBottom: 22 },
  intro: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 21, color: color.text2 },
  row: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  eventTitle: { fontFamily: fontFamily.bold, fontSize: 15, color: color.text },
  hint: { fontFamily: fontFamily.regular, fontSize: 12.5, color: color.text3, marginTop: 3 },
});
