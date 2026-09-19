import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../../src/components/GlassCard";
import { BarList } from "../../src/components/charts";
import { ChevronRight } from "../../src/components/icons";
import { useAppStore } from "../../src/context/AppStore";
import { useOrganizerGuard } from "../../src/hooks/useOrganizerGuard";
import { compareEvents } from "../../src/core/orgAnalytics";
import { formatUsd } from "../../src/core/pricing";
import { color, fontFamily, spacing } from "../../src/theme/tokens";

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

export default function CompararScreen() {
  const allowed = useOrganizerGuard();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { events, myOrganizerId, analyticsOrders, analyticsTickets, analyticsViews } = useAppStore();

  const rows = useMemo(() => {
    const mine = events.filter((e) => e.organizerId === myOrganizerId);
    return compareEvents(
      mine.map((e) => ({ id: e.id, title: e.title, starts_at: e.startsAt, status: e.status ?? "published", capacity: e.ticketTypes.reduce((s, t) => s + t.quantity, 0) })),
      analyticsOrders,
      analyticsTickets,
      analyticsViews
    ).sort((a, b) => b.netCents - a.netCents);
  }, [events, myOrganizerId, analyticsOrders, analyticsTickets, analyticsViews]);

  if (!allowed) return null;

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 60 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ChevronRight color={color.text} />
          </View>
        </Pressable>
        <Text style={styles.title}>Comparar eventos</Text>
        <View style={{ width: 18 }} />
      </View>

      {rows.length === 0 ? (
        <View style={styles.section}>
          <Text style={styles.meta}>Todavía no tienes eventos.</Text>
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingresos netos</Text>
            <GlassCard level="card">
              <View style={{ padding: 16 }}>
                <BarList data={rows.map((r) => ({ name: r.title, value: r.netCents }))} format={formatUsd} />
              </View>
            </GlassCard>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalle</Text>
            <View style={{ gap: 12 }}>
              {rows.map((r) => (
                <GlassCard key={r.eventId} level="card">
                  <Pressable style={{ padding: 14, gap: 10 }} onPress={() => router.push(`/organizador/analiticas/${r.eventId}`)}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {r.title}
                    </Text>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${Math.min(100, r.sellThrough * 100)}%` }]} />
                    </View>
                    <Text style={styles.meta}>
                      {r.tickets} de {r.capacity} vendidas · {pct(r.sellThrough)} del cupo
                    </Text>
                    <View style={styles.grid}>
                      <Cell label="Neto" value={formatUsd(r.netCents)} />
                      <Cell label="Ticket prom." value={r.tickets ? formatUsd(r.avgTicketCents) : "—"} />
                      <Cell label="Visitas" value={String(r.views)} />
                      <Cell label="Visita → compra" value={pct(r.viewToPurchase)} />
                      <Cell label="Conversión" value={pct(r.conversion)} />
                      <Cell label="Asistencia" value={pct(r.attendanceRate)} />
                    </View>
                  </Pressable>
                </GlassCard>
              ))}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.meta}>{label}</Text>
      <Text style={styles.cellValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.screenX, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  title: { fontFamily: fontFamily.extraBold, fontSize: 18, color: color.text },
  section: { paddingHorizontal: spacing.screenX, marginBottom: 20 },
  sectionTitle: { fontFamily: fontFamily.extraBold, fontSize: 16, color: color.text, marginBottom: 10 },
  eventTitle: { fontFamily: fontFamily.bold, fontSize: 15, color: color.text },
  meta: { fontFamily: fontFamily.semiBold, fontSize: 11.5, color: color.text3 },
  track: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.10)", overflow: "hidden" },
  fill: { height: 6, backgroundColor: color.pink },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 10 },
  cell: { width: "33.3%", gap: 2 },
  cellValue: { fontFamily: fontFamily.extraBold, fontSize: 14, color: color.text },
});
