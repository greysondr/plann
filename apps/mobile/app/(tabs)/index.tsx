import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo } from "../../src/components/Logo";
import { Chip } from "../../src/components/Chip";
import { EventHeroCard, EventListCard } from "../../src/components/EventCard";
import { SearchIcon } from "../../src/components/icons";
import { useAppStore } from "../../src/context/AppStore";
import { color, fontFamily, spacing } from "../../src/theme/tokens";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { events, categories } = useAppStore();
  const [category, setCategory] = useState("Todos");

  const sellable = useMemo(() => events.filter((e) => !e.sourceCurated && e.status !== "cancelled" && e.status !== "finished"), [events]);
  const curated = useMemo(() => events.filter((e) => e.sourceCurated), [events]);
  const tours = useMemo(() => sellable.filter((e) => e.kind === "tour" || e.kind === "experience"), [sellable]);
  const featured = useMemo(() => sellable.slice(0, 2), [sellable]);
  const filtered = useMemo(
    () => (category === "Todos" ? sellable : sellable.filter((e) => e.category === category)),
    [sellable, category]
  );

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Logo />
        <Text style={styles.city}>Barquisimeto, Lara</Text>
      </View>

      <Pressable style={styles.searchBar} onPress={() => router.push("/buscar")}>
        <SearchIcon size={18} />
        <Text style={styles.searchPlaceholder}>¿Qué planeas hoy?</Text>
      </Pressable>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {categories.map((cat) => (
          <Chip key={cat} label={cat} selected={cat === category} onPress={() => setCategory(cat)} />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.heroRow}
      >
        {featured.map((event) => (
          <EventHeroCard key={event.id} event={event} />
        ))}
      </ScrollView>

      {tours.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tours y planes</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heroRow}>
            {tours.map((event) => (
              <EventHeroCard key={event.id} event={event} />
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{category === "Todos" ? "Este fin de semana" : category}</Text>
        <View style={styles.list}>
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>Todavía no hay planes en esta categoría. Prueba con otra.</Text>
          ) : (
            filtered.map((event) => <EventListCard key={event.id} event={event} />)
          )}
        </View>
      </View>

      {curated.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cartelera</Text>
          <Text style={styles.sectionSubtitle}>Esto todavía no se vende en Plann, es información pública.</Text>
          <View style={styles.list}>
            {curated.map((event) => (
              <EventListCard key={event.id} event={event} />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.screenX,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  city: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12.5,
    color: color.text3,
  },
  searchBar: {
    marginHorizontal: spacing.screenX,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    marginBottom: 16,
  },
  searchPlaceholder: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: color.text4,
  },
  chipsRow: {
    paddingHorizontal: spacing.screenX,
    gap: 8,
    marginBottom: 18,
  },
  heroRow: {
    paddingHorizontal: spacing.screenX,
    gap: 12,
  },
  section: {
    marginTop: 22,
    paddingHorizontal: spacing.screenX,
  },
  sectionTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: color.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 12.5,
    color: color.text3,
    marginBottom: 12,
  },
  list: {
    gap: spacing.cardGap,
    marginTop: 10,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: color.text3,
  },
});
