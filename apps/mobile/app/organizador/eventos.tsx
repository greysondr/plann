import React, { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../../src/components/GlassCard";
import { Chip } from "../../src/components/Chip";
import { ChevronRight } from "../../src/components/icons";
import { PrimaryButton } from "../../src/components/Button";
import { useAppStore } from "../../src/context/AppStore";
import { useOrganizerGuard } from "../../src/hooks/useOrganizerGuard";
import { sumBy } from "../../src/core/orgAnalytics";
import { formatEventDate } from "../../src/utils/format";
import { formatUsd } from "../../src/core/pricing";
import { color, fontFamily, spacing } from "../../src/theme/tokens";

const TABS = [
  { id: "proximos", label: "Próximos" },
  { id: "borradores", label: "Borradores" },
  { id: "finalizados", label: "Finalizados" },
  { id: "cancelados", label: "Cancelados" },
  { id: "todos", label: "Todos" },
];

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  in_review: "En revisión",
  published: "Publicado",
  sold_out: "Agotado",
  live: "En curso",
  finished: "Finalizado",
  cancelled: "Cancelado",
};

export default function EventosScreen() {
  const allowed = useOrganizerGuard();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { events, myOrganizerId, analyticsOrders, duplicateEvent, publishEvent } = useAppStore();
  const [tab, setTab] = useState("proximos");
  const [busy, setBusy] = useState<string | null>(null);

  const mine = useMemo(() => events.filter((e) => e.organizerId === myOrganizerId), [events, myOrganizerId]);
  const revenue = useMemo(() => new Map(sumBy(analyticsOrders, (o) => o.event_id, new Map()).map((s) => [s.id, s.netCents])), [analyticsOrders]);

  const list = useMemo(() => {
    const filtered = mine.filter((e) => {
      if (tab === "todos") return true;
      if (tab === "borradores") return e.status === "draft";
      if (tab === "cancelados") return e.status === "cancelled";
      if (tab === "finalizados") return e.status === "finished";
      return !["cancelled", "finished", "draft"].includes(e.status ?? "");
    });
    return filtered.sort((a, b) => (tab === "finalizados" || tab === "todos" ? (a.startsAt < b.startsAt ? 1 : -1) : a.startsAt < b.startsAt ? -1 : 1));
  }, [mine, tab]);

  if (!allowed) return null;

  async function handleDuplicate(id: string) {
    setBusy(id);
    const result = await duplicateEvent(id);
    setBusy(null);
    if (result.ok && result.eventId) router.push(`/organizador/editar/${result.eventId}`);
  }

  async function handlePublish(id: string) {
    setBusy(id);
    await publishEvent(id);
    setBusy(null);
  }

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 60 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ChevronRight color={color.text} />
          </View>
        </Pressable>
        <Text style={styles.title}>Mis eventos</Text>
        <View style={{ width: 18 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map((t) => (
          <Chip key={t.id} label={t.label} selected={tab === t.id} onPress={() => setTab(t.id)} />
        ))}
      </ScrollView>

      <View style={styles.section}>
        {list.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No hay eventos aquí</Text>
            <Text style={styles.emptySubtitle}>Publica uno nuevo para empezar a vender entradas.</Text>
            <PrimaryButton label="Publicar evento" onPress={() => router.push("/organizador/crear")} style={{ marginTop: 14 }} />
          </View>
        )}
        <View style={{ gap: 12 }}>
          {list.map((event) => {
            const sold = event.ticketTypes.reduce((s, t) => s + t.sold, 0);
            const cap = event.ticketTypes.reduce((s, t) => s + t.quantity, 0);
            const closed = event.status === "cancelled" || event.status === "finished";
            return (
              <GlassCard key={event.id} level="card">
                <View style={{ padding: 14, gap: 10 }}>
                  <Pressable style={styles.topRow} onPress={() => router.push(`/organizador/analiticas/${event.id}`)}>
                    {event.imageUrl ? <Image source={{ uri: event.imageUrl }} style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbEmpty]} />}
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={styles.eventTitle} numberOfLines={1}>
                        {event.title}
                      </Text>
                      <Text style={styles.meta}>{formatEventDate(event.startsAt)}</Text>
                      <Text style={styles.status}>{event.salesPaused && !closed ? "Ventas pausadas" : STATUS_LABEL[event.status ?? ""] ?? event.status}</Text>
                    </View>
                    <Text style={styles.revenue}>{formatUsd(revenue.get(event.id) ?? 0)}</Text>
                  </Pressable>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${cap ? Math.min(1, sold / cap) * 100 : 0}%` }]} />
                  </View>
                  <Text style={styles.meta}>
                    {sold} / {cap} vendidas
                  </Text>
                  <View style={styles.actions}>
                    <Pressable style={styles.chip} onPress={() => router.push(`/organizador/analiticas/${event.id}`)}>
                      <Text style={styles.chipText}>Analíticas</Text>
                    </Pressable>
                    <Pressable style={styles.chip} onPress={() => router.push(`/organizador/asistentes/${event.id}`)}>
                      <Text style={styles.chipText}>Asistentes</Text>
                    </Pressable>
                    {!closed && (
                      <Pressable style={styles.chip} onPress={() => router.push(`/organizador/editar/${event.id}`)}>
                        <Text style={styles.chipText}>Editar</Text>
                      </Pressable>
                    )}
                    {!closed && event.status !== "draft" && (
                      <Pressable style={styles.chip} onPress={() => router.push(`/organizador/escanear?eventId=${event.id}`)}>
                        <Text style={styles.chipText}>Escanear</Text>
                      </Pressable>
                    )}
                    {event.status === "draft" && (
                      <Pressable style={[styles.chip, styles.chipPrimary]} disabled={busy === event.id} onPress={() => handlePublish(event.id)}>
                        <Text style={[styles.chipText, { color: color.white }]}>Publicar</Text>
                      </Pressable>
                    )}
                    <Pressable style={styles.chip} disabled={busy === event.id} onPress={() => handleDuplicate(event.id)}>
                      <Text style={styles.chipText}>Duplicar</Text>
                    </Pressable>
                  </View>
                </View>
              </GlassCard>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.screenX, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  title: { fontFamily: fontFamily.extraBold, fontSize: 18, color: color.text },
  tabs: { paddingHorizontal: spacing.screenX, gap: 8, marginBottom: 16 },
  section: { paddingHorizontal: spacing.screenX },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  thumb: { width: 64, height: 40, borderRadius: 10 },
  thumbEmpty: { backgroundColor: "rgba(255,255,255,0.08)" },
  eventTitle: { fontFamily: fontFamily.bold, fontSize: 15, color: color.text },
  meta: { fontFamily: fontFamily.semiBold, fontSize: 12, color: color.text3 },
  status: { fontFamily: fontFamily.bold, fontSize: 11.5, color: color.pink },
  revenue: { fontFamily: fontFamily.extraBold, fontSize: 13, color: color.pink },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.10)", overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: color.pink },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  chipPrimary: { backgroundColor: color.pink, borderColor: color.pink },
  chipText: { fontFamily: fontFamily.semiBold, fontSize: 12, color: color.text2 },
  emptyBox: { padding: 20, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", alignItems: "center" },
  emptyTitle: { fontFamily: fontFamily.bold, fontSize: 14.5, color: color.text, textAlign: "center" },
  emptySubtitle: { fontFamily: fontFamily.regular, fontSize: 12.5, color: color.text3, textAlign: "center", marginTop: 6, lineHeight: 18 },
});
