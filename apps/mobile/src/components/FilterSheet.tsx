import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Chip } from "./Chip";
import { PrimaryButton } from "./Button";
import { formatShortDate } from "../utils/format";
import { fromCalendarDateString, toCalendarDateString, type DateFilter, type PriceFilter } from "../utils/eventFilters";
import { color, fontFamily, radius, spacing } from "../theme/tokens";

// Español de Venezuela para el calendario (sección 7 de la identidad).
LocaleConfig.locales.es = {
  monthNames: [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ],
  monthNamesShort: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
  dayNames: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
  dayNamesShort: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
  today: "hoy",
};
LocaleConfig.defaultLocale = "es";

const DATE_OPTIONS: { key: DateFilter; label: string }[] = [
  { key: "todos", label: "Cualquier fecha" },
  { key: "hoy", label: "Hoy" },
  { key: "manana", label: "Mañana" },
  { key: "finde", label: "Este fin de semana" },
];

const PRICE_OPTIONS: { key: PriceFilter; label: string }[] = [
  { key: "todos", label: "Cualquier precio" },
  { key: "gratis", label: "Gratis" },
  { key: "menos10", label: "Menos de $10" },
  { key: "10a30", label: "$10 a $30" },
  { key: "mas30", label: "Más de $30" },
];

export interface FilterState {
  date: DateFilter;
  customDate: string | null; // "YYYY-MM-DD", solo cuando date === "fecha"
  price: PriceFilter;
  city: string;
  onlyAvailable: boolean;
}

export const DEFAULT_FILTERS: FilterState = {
  date: "todos",
  customDate: null,
  price: "todos",
  city: "Todas",
  onlyAvailable: false,
};

export function countActiveFilters(f: FilterState): number {
  let n = 0;
  if (f.date !== "todos") n++;
  if (f.price !== "todos") n++;
  if (f.city !== "Todas") n++;
  if (f.onlyAvailable) n++;
  return n;
}

export function FilterSheet({
  visible,
  onClose,
  filters,
  onChange,
  cities,
  resultCount,
}: {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onChange: (next: FilterState) => void;
  cities: string[];
  resultCount: number;
}) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: 20, marginBottom: 88 + insets.bottom }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Filtros</Text>
          <Pressable onPress={() => onChange(DEFAULT_FILTERS)}>
            <Text style={styles.clearLink}>Limpiar</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 10 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.groupTitle}>Fecha</Text>
          <View style={styles.chipsWrap}>
            {DATE_OPTIONS.map((opt) => (
              <Chip
                key={opt.key}
                label={opt.label}
                selected={filters.date === opt.key}
                onPress={() => onChange({ ...filters, date: opt.key, customDate: null })}
              />
            ))}
            <Chip
              label={filters.date === "fecha" && filters.customDate ? formatShortDate(fromCalendarDateString(filters.customDate).toISOString()) : "Elegir en el calendario"}
              selected={filters.date === "fecha"}
              onPress={() => onChange({ ...filters, date: "fecha" })}
            />
          </View>

          {filters.date === "fecha" && (
            <View style={styles.calendarCard}>
              <Calendar
                current={filters.customDate ?? toCalendarDateString(new Date())}
                minDate={toCalendarDateString(new Date())}
                onDayPress={(day: { dateString: string }) => onChange({ ...filters, date: "fecha", customDate: day.dateString })}
                markedDates={
                  filters.customDate
                    ? { [filters.customDate]: { selected: true, selectedColor: color.pink } }
                    : {}
                }
                firstDay={1}
                theme={{
                  backgroundColor: "transparent",
                  calendarBackground: "transparent",
                  textSectionTitleColor: color.text3,
                  dayTextColor: color.text,
                  todayTextColor: color.pink,
                  monthTextColor: color.text,
                  textDisabledColor: color.text4,
                  arrowColor: color.pink,
                  selectedDayBackgroundColor: color.pink,
                  selectedDayTextColor: color.white,
                  textDayFontFamily: fontFamily.semiBold,
                  textMonthFontFamily: fontFamily.extraBold,
                  textDayHeaderFontFamily: fontFamily.bold,
                }}
                style={styles.calendar}
              />
            </View>
          )}

          <Text style={styles.groupTitle}>Precio</Text>
          <View style={styles.chipsWrap}>
            {PRICE_OPTIONS.map((opt) => (
              <Chip
                key={opt.key}
                label={opt.label}
                selected={filters.price === opt.key}
                onPress={() => onChange({ ...filters, price: opt.key })}
              />
            ))}
          </View>

          <Text style={styles.groupTitle}>Ciudad</Text>
          <View style={styles.chipsWrap}>
            <Chip label="Todas" selected={filters.city === "Todas"} onPress={() => onChange({ ...filters, city: "Todas" })} />
            {cities.map((c) => (
              <Chip key={c} label={c} selected={filters.city === c} onPress={() => onChange({ ...filters, city: c })} />
            ))}
          </View>

          <Pressable
            style={styles.availabilityRow}
            onPress={() => onChange({ ...filters, onlyAvailable: !filters.onlyAvailable })}
          >
            <View>
              <Text style={styles.availabilityTitle}>Solo con cupo disponible</Text>
              <Text style={styles.availabilitySubtitle}>Oculta los planes agotados y la cartelera informativa</Text>
            </View>
            <View style={[styles.checkbox, filters.onlyAvailable && styles.checkboxOn]}>
              {filters.onlyAvailable && <View style={styles.checkboxDot} />}
            </View>
          </Pressable>
        </ScrollView>

        <PrimaryButton label={`Ver ${resultCount} resultado${resultCount === 1 ? "" : "s"}`} onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    zIndex: 100,
    elevation: 100,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    backgroundColor: "#151417",
    borderTopLeftRadius: radius.screen,
    borderTopRightRadius: radius.screen,
    paddingHorizontal: spacing.screenX,
    paddingTop: 10,
    maxHeight: "70%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: fontFamily.extraBold,
    fontSize: 20,
    letterSpacing: -0.4,
    color: color.text,
  },
  clearLink: {
    fontFamily: fontFamily.bold,
    fontSize: 13.5,
    color: color.pink,
  },
  groupTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 13,
    color: color.text3,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 10,
    marginTop: 16,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  calendarCard: {
    marginTop: 12,
    borderRadius: radius.card,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
    paddingBottom: 6,
  },
  calendar: {
    borderRadius: radius.card,
  },
  availabilityRow: {
    marginTop: 20,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 14,
    borderRadius: radius.card,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  availabilityTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: color.text,
  },
  availabilitySubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 11.5,
    color: color.text3,
    marginTop: 2,
    maxWidth: 260,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: {
    backgroundColor: color.pink,
    borderColor: color.pink,
  },
  checkboxDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: color.white,
  },
});
