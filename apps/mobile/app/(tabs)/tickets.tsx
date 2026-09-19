import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Chip } from "../../src/components/Chip";
import { TicketCard } from "../../src/components/TicketCard";
import { GlassCard } from "../../src/components/GlassCard";
import { PrimaryButton } from "../../src/components/Button";
import { useAppStore } from "../../src/context/AppStore";
import { formatEventDate } from "../../src/utils/format";
import { formatUsd } from "../../src/core/pricing";
import { color, fontFamily, spacing } from "../../src/theme/tokens";

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pendiente de pago",
  in_verification: "Verificando tu pago",
  rejected: "Referencia rechazada",
  expired: "Reserva expirada",
};

type Tab = "proximos" | "pasados" | "pendientes";

export default function TicketsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { events, tickets, orders } = useAppStore();
  const [tab, setTab] = useState<Tab>("proximos");

  const now = Date.now();

  const enriched = useMemo(
    () =>
      tickets
        .map((ticket) => {
          const event = events.find((e) => e.id === ticket.eventId);
          const order = orders.find((o) => o.id === ticket.orderId);
          return event ? { ticket, event, order } : null;
        })
        .filter(Boolean) as { ticket: (typeof tickets)[number]; event: (typeof events)[number]; order: (typeof orders)[number] }[],
    [tickets, events, orders]
  );

  const proximos = enriched.filter((t) => t.ticket.status === "valid" && new Date(t.event.startsAt).getTime() >= now);
  const pasados = enriched.filter((t) => t.ticket.status !== "valid" || new Date(t.event.startsAt).getTime() < now);
  const pendientes = orders.filter((o) => ["pending_payment", "in_verification", "rejected"].includes(o.status));

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 12 }}>
      <Text style={styles.screenTitle}>Mis tickets</Text>

      <View style={styles.tabsRow}>
        <Chip label="Próximos" selected={tab === "proximos"} onPress={() => setTab("proximos")} />
        <Chip label="Pasados" selected={tab === "pasados"} onPress={() => setTab("pasados")} />
        <Chip label={`Pendientes${pendientes.length ? ` (${pendientes.length})` : ""}`} selected={tab === "pendientes"} onPress={() => setTab("pendientes")} />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {tab === "proximos" &&
          (proximos.length === 0 ? (
            <EmptyState
              title="Todavía no tienes tickets"
              subtitle="Explora los planes más populares de tu ciudad esta semana."
              onPress={() => router.push("/")}
            />
          ) : (
            proximos.map(({ ticket, event, order }) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                event={event}
                ticketTypeName={event.ticketTypes.find((t) => t.id === order?.ticketTypeId)?.name ?? "General"}
              />
            ))
          ))}

        {tab === "pasados" &&
          (pasados.length === 0 ? (
            <EmptyState title="Sin tickets pasados" subtitle="Aquí aparecerán los eventos a los que ya fuiste." />
          ) : (
            pasados.map(({ ticket, event, order }) => (
              <View key={ticket.id} style={{ gap: 8 }}>
                <TicketCard
                  ticket={ticket}
                  event={event}
                  ticketTypeName={event.ticketTypes.find((t) => t.id === order?.ticketTypeId)?.name ?? "General"}
                />
                {event.status !== "cancelled" && ticket.status !== "void" && new Date(event.startsAt).getTime() <= Date.now() && (
                  <Pressable onPress={() => router.push(`/resena/${event.id}`)} style={{ alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: color.pink }}>
                    <Text style={{ fontFamily: fontFamily.bold, fontSize: 12.5, color: color.pink }}>Calificar este evento</Text>
                  </Pressable>
                )}
              </View>
            ))
          ))}

        {tab === "pendientes" &&
          (pendientes.length === 0 ? (
            <EmptyState title="No tienes pagos pendientes" subtitle="Cuando compres un ticket con pago móvil o Zelle, el estado aparece aquí." />
          ) : (
            pendientes.map((order) => {
              const event = events.find((e) => e.id === order.eventId);
              if (!event) return null;
              return (
                <GlassCard key={order.id} level="card" style={styles.pendingCard}>
                  <View style={{ padding: 15, gap: 6 }}>
                    <Text style={styles.pendingEvent} numberOfLines={1}>
                      {event.title}
                    </Text>
                    <Text style={styles.pendingMeta}>{formatEventDate(event.startsAt)}</Text>
                    <Text style={styles.pendingStatus}>{ORDER_STATUS_LABEL[order.status] ?? order.status}</Text>
                    <Text style={styles.pendingTotal}>{formatUsd(order.totalCents)} · {order.quantity} ticket(s)</Text>
                    {order.status !== "expired" && (
                      <PrimaryButton
                        label={order.status === "in_verification" ? "Ver estado" : "Continuar pago"}
                        onPress={() => router.push(`/checkout/${event.id}?orderId=${order.id}`)}
                        style={{ marginTop: 6 }}
                      />
                    )}
                  </View>
                </GlassCard>
              );
            })
          ))}
      </ScrollView>
    </View>
  );
}

function EmptyState({ title, subtitle, onPress }: { title: string; subtitle: string; onPress?: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
      {onPress && (
        <Pressable onPress={onPress} style={{ marginTop: 12 }}>
          <Text style={styles.emptyLink}>Explorar planes</Text>
        </Pressable>
      )}
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
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.screenX,
    marginBottom: 16,
  },
  list: {
    paddingHorizontal: spacing.screenX,
    gap: 16,
    paddingBottom: 140,
  },
  pendingCard: {},
  pendingEvent: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: color.text,
  },
  pendingMeta: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12.5,
    color: color.text3,
  },
  pendingStatus: {
    fontFamily: fontFamily.extraBold,
    fontSize: 11,
    color: color.pink,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginTop: 2,
  },
  pendingTotal: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: color.text,
  },
  empty: {
    marginTop: 60,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: color.text,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: color.text3,
    textAlign: "center",
    marginTop: 6,
  },
  emptyLink: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: color.pink,
  },
});
