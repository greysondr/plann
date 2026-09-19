import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../../src/components/GlassCard";
import { ChevronRight, ScanIcon } from "../../src/components/icons";
import { PrimaryButton } from "../../src/components/Button";
import { useAppStore } from "../../src/context/AppStore";
import { useOrganizerGuard } from "../../src/hooks/useOrganizerGuard";
import { formatEventDate } from "../../src/utils/format";
import { formatUsd } from "../../src/core/pricing";
import { color, fontFamily, radius, spacing } from "../../src/theme/tokens";

const PLAN_LABEL: Record<string, string> = {
  basico: "Plan Básico",
  pro: "Plan Pro",
  business: "Plan Business",
};

export default function OrganizadorScreen() {
  const allowed = useOrganizerGuard();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { events, organizerOrders, organizerProfile, myOrganizerId, balance } = useAppStore();

  const myEvents = events.filter((e) => e.organizerId === myOrganizerId);
  const myEventIds = new Set(myEvents.map((e) => e.id));

  const paidOrders = organizerOrders.filter((o) => o.status === "paid" && myEventIds.has(o.eventId));
  const pendingOrders = organizerOrders.filter(
    (o) => (o.status === "pending_payment" || o.status === "in_verification") && myEventIds.has(o.eventId)
  );
  const netCents = paidOrders.reduce((sum, o) => sum + o.organizerNetCents, 0);
  const ticketsSold = myEvents.reduce((sum, e) => sum + e.ticketTypes.reduce((s, tt) => s + tt.sold, 0), 0);
  const capacity = myEvents.reduce((sum, e) => sum + e.ticketTypes.reduce((s, tt) => s + tt.quantity, 0), 0);

  if (!allowed) return null;

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 60 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ChevronRight color={color.text} />
          </View>
        </Pressable>
        <Text style={styles.title}>Organizador</Text>
        <View style={{ width: 18 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.organizerName}>{organizerProfile?.name ?? "Tu negocio"}</Text>
        <Text style={styles.organizerPlan}>{PLAN_LABEL.basico}</Text>
      </View>

      <View style={styles.section}>
        <GlassCard level="card">
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.statLabel}>Saldo disponible</Text>
              <Text style={styles.balanceValue}>{formatUsd(balance.availableCents)}</Text>
              {balance.pendingCents > 0 && (
                <Text style={styles.statLabel}>{formatUsd(balance.pendingCents)} en proceso de pago</Text>
              )}
            </View>
            <Pressable style={styles.withdrawButton} onPress={() => router.push("/organizador/retiros")}>
              <Text style={styles.withdrawButtonText}>Retirar</Text>
            </Pressable>
          </View>
        </GlassCard>
      </View>

      <View style={styles.section}>
        <View style={styles.statsGrid}>
          <GlassCard level="card" style={styles.statCard}>
            <View style={styles.statInner}>
              <Text style={styles.statValue}>{formatUsd(netCents)}</Text>
              <Text style={styles.statLabel}>Ingresos netos</Text>
            </View>
          </GlassCard>
          <GlassCard level="card" style={styles.statCard}>
            <View style={styles.statInner}>
              <Text style={styles.statValue}>
                {ticketsSold}
                <Text style={styles.statValueMuted}>/{capacity}</Text>
              </Text>
              <Text style={styles.statLabel}>Entradas vendidas</Text>
            </View>
          </GlassCard>
          <GlassCard level="card" style={styles.statCard}>
            <View style={styles.statInner}>
              <Text style={styles.statValue}>{myEvents.filter((e) => e.status !== "cancelled").length}</Text>
              <Text style={styles.statLabel}>Eventos publicados</Text>
            </View>
          </GlassCard>
          <GlassCard level="card" style={styles.statCard}>
            <View style={styles.statInner}>
              <Text style={styles.statValue}>{pendingOrders.length}</Text>
              <Text style={styles.statLabel}>Pagos por confirmar</Text>
            </View>
          </GlassCard>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.actionsRow}>
          <PrimaryButton label="Publicar evento" onPress={() => router.push("/organizador/crear")} style={{ flex: 1 }} />
          <Pressable style={styles.scanButton} onPress={() => router.push("/organizador/escanear")}>
            <ScanIcon size={20} />
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mis eventos</Text>
        <View style={{ gap: 12, marginTop: 10 }}>
          {myEvents.map((event) => {
            const sold = event.ticketTypes.reduce((s, tt) => s + tt.sold, 0);
            const quantity = event.ticketTypes.reduce((s, tt) => s + tt.quantity, 0);
            const pct = quantity ? Math.min(1, sold / quantity) : 0;
            const eventNetCents = paidOrders
              .filter((o) => o.eventId === event.id)
              .reduce((sum, o) => sum + o.organizerNetCents, 0);
            return (
              <GlassCard key={event.id} level="card">
                <Pressable style={{ padding: 15, gap: 8 }} onPress={() => router.push(`/organizador/asistentes/${event.id}`)}>
                  <View style={styles.eventTopRow}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {event.title}
                    </Text>
                    <Text style={styles.eventRevenue}>{formatUsd(eventNetCents)}</Text>
                  </View>
                  <Text style={styles.eventMeta}>
                    {formatEventDate(event.startsAt)}
                    {event.status === "cancelled" ? " · Cancelado" : event.salesPaused ? " · Ventas pausadas" : ""}
                  </Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
                  </View>
                  <Text style={styles.progressLabel}>
                    {sold} / {quantity} vendidos
                  </Text>
                  <View style={styles.rowButtons}>
                    <Text style={styles.linkText}>Ver asistentes</Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation?.();
                          router.push(`/organizador/editar/${event.id}`);
                        }}
                        style={styles.scanChip}
                      >
                        <Text style={styles.scanChipText}>Editar</Text>
                      </Pressable>
                      {event.status !== "cancelled" && (
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation?.();
                            router.push(`/organizador/escanear?eventId=${event.id}`);
                          }}
                          style={styles.scanChip}
                        >
                          <ScanIcon size={16} />
                          <Text style={styles.scanChipText}>Escanear</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </Pressable>
              </GlassCard>
            );
          })}
          {myEvents.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Todavía no tienes eventos publicados</Text>
              <Text style={styles.emptySubtitle}>
                Publica tu primer evento para empezar a vender entradas y ver aquí tus estadísticas.
              </Text>
              <PrimaryButton
                label="Publicar mi primer evento"
                onPress={() => router.push("/organizador/crear")}
                style={{ marginTop: 14 }}
              />
            </View>
          )}
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
  title: {
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
    color: color.text,
  },
  section: {
    paddingHorizontal: spacing.screenX,
    marginBottom: 22,
  },
  organizerName: {
    fontFamily: fontFamily.extraBold,
    fontSize: 20,
    color: color.text,
  },
  organizerPlan: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12.5,
    color: color.pink,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "47.5%",
  },
  statInner: {
    padding: 14,
    gap: 4,
  },
  statValue: {
    fontFamily: fontFamily.extraBold,
    fontSize: 20,
    color: color.text,
  },
  balanceRow: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  balanceValue: {
    fontFamily: fontFamily.extraBold,
    fontSize: 26,
    color: color.text,
    marginVertical: 2,
  },
  withdrawButton: {
    paddingHorizontal: 20,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: color.pink,
    alignItems: "center",
    justifyContent: "center",
  },
  withdrawButtonText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: color.white,
  },
  statValueMuted: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: color.text3,
  },
  statLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11.5,
    color: color.text3,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  scanButton: {
    width: 50,
    height: 50,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  sectionTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
    color: color.text,
  },
  eventTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  eventTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: color.text,
    flex: 1,
  },
  eventRevenue: {
    fontFamily: fontFamily.extraBold,
    fontSize: 13,
    color: color.pink,
  },
  eventMeta: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: color.text3,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    backgroundColor: color.pink,
  },
  progressLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: color.text3,
  },
  rowButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  linkText: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: color.pink,
  },
  scanChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  scanChipText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11.5,
    color: color.text2,
  },
  emptyBox: {
    padding: 20,
    borderRadius: radius.cardLarge,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
  },
  emptyTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 14.5,
    color: color.text,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 12.5,
    color: color.text3,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
});
