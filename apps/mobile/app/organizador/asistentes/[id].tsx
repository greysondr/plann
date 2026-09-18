import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../../../src/components/GlassCard";
import { ChevronRight } from "../../../src/components/icons";
import { useAppStore, useEvent } from "../../../src/context/AppStore";
import { useOrganizerGuard } from "../../../src/hooks/useOrganizerGuard";
import { formatUsd } from "../../../src/core/pricing";
import { color, fontFamily, spacing } from "../../../src/theme/tokens";

const STATUS_LABEL: Record<string, string> = {
  valid: "Pagado",
  used: "Check-in hecho",
  void: "Anulado",
};

export default function AsistentesScreen() {
  const allowed = useOrganizerGuard();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const event = useEvent(id);
  const { tickets, orders } = useAppStore();

  const eventTickets = tickets.filter((t) => t.eventId === id);
  const checkedIn = eventTickets.filter((t) => t.status === "used").length;

  if (!allowed || !event) return null;

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 60 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ChevronRight color={color.text} />
          </View>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
        <View style={{ width: 18 }} />
      </View>

      <View style={styles.section}>
        <GlassCard level="card">
          <View style={styles.counterRow}>
            <Text style={styles.counterValue}>
              {checkedIn} / {eventTickets.length}
            </Text>
            <Text style={styles.counterLabel}>dentro</Text>
          </View>
        </GlassCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Asistentes</Text>
        <View style={{ gap: 10, marginTop: 10 }}>
          {eventTickets.length === 0 && <Text style={styles.emptyText}>Aún no hay ventas.</Text>}
          {eventTickets.map((ticket) => {
            const order = orders.find((o) => o.id === ticket.orderId);
            return (
              <GlassCard key={ticket.id} level="field">
                <View style={styles.attendeeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.attendeeName}>{ticket.attendeeName}</Text>
                    <Text style={styles.attendeeCode}>{ticket.code}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.attendeeStatus}>{STATUS_LABEL[ticket.status]}</Text>
                    {order && <Text style={styles.attendeeMethod}>{formatUsd(order.totalCents)}</Text>}
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
  header: {
    paddingHorizontal: spacing.screenX,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  title: {
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
    color: color.text,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
  },
  section: {
    paddingHorizontal: spacing.screenX,
    marginBottom: 22,
  },
  counterRow: {
    padding: 18,
    alignItems: "center",
  },
  counterValue: {
    fontFamily: fontFamily.extraBold,
    fontSize: 30,
    color: color.text,
  },
  counterLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: color.text3,
  },
  sectionTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
    color: color.text,
  },
  attendeeRow: {
    flexDirection: "row",
    padding: 14,
    alignItems: "center",
  },
  attendeeName: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: color.text,
  },
  attendeeCode: {
    fontFamily: "Courier",
    fontSize: 12,
    color: color.text3,
    letterSpacing: 1,
    marginTop: 2,
  },
  attendeeStatus: {
    fontFamily: fontFamily.extraBold,
    fontSize: 11,
    color: color.pink,
    textTransform: "uppercase",
  },
  attendeeMethod: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: color.text3,
    marginTop: 2,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: color.text3,
  },
});
