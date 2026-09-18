import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SearchIcon, FilterIcon, MapPinIcon, ListIcon } from "../../src/components/icons";
import { Chip } from "../../src/components/Chip";
import { EventListCard } from "../../src/components/EventCard";
import { CategoryCircle } from "../../src/components/CategoryCircle";
import { EventsMapView } from "../../src/components/EventsMapView";
import { FilterSheet, DEFAULT_FILTERS, countActiveFilters, type FilterState } from "../../src/components/FilterSheet";
import { useAppStore } from "../../src/context/AppStore";
import { categoryImages } from "../../src/theme/categoryImages";
import { normalizeSearch } from "../../src/utils/format";
import { matchesDateFilter, matchesPriceFilter, getAvailability } from "../../src/utils/eventFilters";
import { color, fontFamily, spacing } from "../../src/theme/tokens";

export default function BuscarScreen() {
  const insets = useSafeAreaInsets();
  const { events, categories } = useAppStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"lista" | "mapa">("lista");

  const activeFilterCount = countActiveFilters(filters);
  const browsing = !query.trim() && category === "Todos" && activeFilterCount === 0;

  const cities = useMemo(() => {
    const set = new Set(events.map((e) => e.city));
    return Array.from(set).sort();
  }, [events]);

  const matchesFilters = useMemo(() => {
    return (event: (typeof events)[number]) => {
      if (category !== "Todos" && event.category !== category) return false;
      if (!matchesDateFilter(event.startsAt, filters.date, new Date(), filters.customDate)) return false;
      if (!matchesPriceFilter(event, filters.price)) return false;
      if (filters.city !== "Todas" && event.city !== filters.city) return false;
      if (filters.onlyAvailable && getAvailability(event) <= 0) return false;
      return true;
    };
  }, [category, filters]);

  const results = useMemo(() => {
    const q = normalizeSearch(query);
    return events.filter((event) => {
      if (!matchesFilters(event)) return false;
      if (!q) return true;
      const haystack = normalizeSearch(`${event.title} ${event.city} ${event.venueName} ${event.category}`);
      return haystack.includes(q);
    });
  }, [events, query, matchesFilters]);

  const groupedResults = useMemo(() => {
    if (category !== "Todos") return null;
    const groups = new Map<string, typeof results>();
    for (const event of results) {
      const list = groups.get(event.category) ?? [];
      list.push(event);
      groups.set(event.category, list);
    }
    return Array.from(groups.entries());
  }, [results, category]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 12 }}>
      <Text style={styles.screenTitle}>Buscar</Text>

      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <SearchIcon size={18} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Busca por nombre, lugar o categoría"
            placeholderTextColor={color.text4}
            style={styles.input}
            autoCorrect={false}
          />
        </View>
        <Pressable style={styles.filterButton} onPress={() => setSheetOpen(true)}>
          <FilterIcon active={activeFilterCount > 0} size={18} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}
      >
        <Chip
          label="Solo gratis"
          selected={filters.price === "gratis"}
          onPress={() => setFilters((f) => ({ ...f, price: f.price === "gratis" ? "todos" : "gratis" }))}
        />
        {categories.map((cat) => (
          <Chip key={cat} label={cat} selected={cat === category} onPress={() => setCategory(cat)} />
        ))}
      </ScrollView>

      <View style={styles.mapToggleRow}>
        <Text style={styles.resultsCount}>
          {results.length} plan{results.length === 1 ? "" : "es"}
          {activeFilterCount > 0 ? ` · ${activeFilterCount} filtro${activeFilterCount === 1 ? "" : "s"}` : ""}
        </Text>
        <Pressable
          style={styles.mapToggleButton}
          onPress={() => setViewMode((v) => (v === "lista" ? "mapa" : "lista"))}
        >
          {viewMode === "lista" ? <MapPinIcon size={14} /> : <ListIcon active size={14} />}
          <Text style={styles.mapToggleText}>{viewMode === "lista" ? "Ver en mapa" : "Ver en lista"}</Text>
        </Pressable>
      </View>

      {viewMode === "mapa" ? (
        <EventsMapView events={results} />
      ) : (
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {browsing ? (
          <>
            <Text style={styles.sectionTitle}>Categorías</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryRow}
            >
              {categories
                .filter((c) => c !== "Todos")
                .map((cat) => (
                  <CategoryCircle
                    key={cat}
                    label={cat}
                    imageUrl={categoryImages[cat]}
                    selected={category === cat}
                    onPress={() => setCategory(cat)}
                  />
                ))}
            </ScrollView>

            <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Todo lo que hay</Text>
            <View style={{ gap: spacing.cardGap, marginTop: 10 }}>
              {results.map((event) => (
                <EventListCard key={event.id} event={event} />
              ))}
            </View>
          </>
        ) : results.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No encontramos "{query || category}"</Text>
            <Text style={styles.emptySubtitle}>Prueba con otra categoría, quita un filtro o revisa la cartelera del fin de semana.</Text>
            {activeFilterCount > 0 && (
              <Pressable onPress={() => setFilters(DEFAULT_FILTERS)} style={{ marginTop: 12 }}>
                <Text style={styles.emptyLink}>Quitar filtros</Text>
              </Pressable>
            )}
          </View>
        ) : category === "Todos" && groupedResults ? (
          <>
            {groupedResults.map(([cat, items]) => (
              <View key={cat} style={{ marginTop: 18 }}>
                <Text style={styles.sectionTitle}>{cat}</Text>
                <View style={{ gap: spacing.cardGap, marginTop: 10 }}>
                  {items.map((event) => (
                    <EventListCard key={event.id} event={event} />
                  ))}
                </View>
              </View>
            ))}
          </>
        ) : (
          <View style={{ gap: spacing.cardGap }}>
            {results.map((event) => (
              <EventListCard key={event.id} event={event} />
            ))}
          </View>
        )}
      </ScrollView>
      )}

      <FilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        onChange={setFilters}
        cities={cities}
        resultCount={results.length}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 26,
    letterSpacing: -0.5,
    color: color.text,
    paddingHorizontal: spacing.screenX,
    marginBottom: 14,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: spacing.screenX,
    marginBottom: 14,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: color.text,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: color.pink,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    fontFamily: fontFamily.extraBold,
    fontSize: 10,
    color: color.white,
  },
  chipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
    height: 46,
  },
  chipsRow: {
    paddingHorizontal: spacing.screenX,
    gap: 8,
    alignItems: "center",
  },
  mapToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenX,
    marginTop: 10,
    marginBottom: 4,
  },
  mapToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(233,65,127,0.4)",
  },
  mapToggleText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: color.pink,
  },
  list: {
    paddingHorizontal: spacing.screenX,
    paddingTop: 14,
    paddingBottom: 140,
  },
  sectionTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 17,
    letterSpacing: -0.3,
    color: color.text,
  },
  resultsCount: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12.5,
    color: color.text3,
  },
  categoryScroll: {
    flexGrow: 0,
    flexShrink: 0,
    height: 100,
  },
  categoryRow: {
    gap: 10,
    marginTop: 10,
    paddingRight: spacing.screenX,
  },
  empty: {
    marginTop: 40,
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: color.text,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: color.text3,
    textAlign: "center",
  },
  emptyLink: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: color.pink,
  },
});
