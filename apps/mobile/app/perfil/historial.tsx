import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../../src/components/GlassCard";
import { ChevronRight } from "../../src/components/icons";
import { useAppStore } from "../../src/context/AppStore";
import { formatEventDate } from "../../src/utils/format";
import { formatUsd } from "../../src/core/pricing";
import type { OrderStatus } from "../../src/core/types";
import { color, fontFamily, spacing } from "../../src/theme/tokens";
import { InfoTip } from "../../src/components/InfoTip";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Pendiente de pago",
  in_verification: "Verificando pago",
  paid: "Pagada",
  rejected: "Rechazada",
  expired: "Expirada",
  cancelled: "Cancelada",
  refund_pending: "Reembolso en proceso",
  refunded: "Reembolsada",
};

export default function HistorialScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { orders, events } = useAppStore();

  const sorted = useMemo(
    () => [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders]
  );

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 60 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ChevronRight color={color.text} />
          </View>
        </Pressable>
        <Text style={styles.title}>Historial de compras</Text>
        <InfoTip label="Historial de compras" size={18} />
      </View>

      <View style={styles.section}>
        {sorted.length === 0 ? (
          <Text style={styles.emptyText}>Todavía no tienes compras. Cuando compres un ticket, aparece aquí.</Text>
        ) : (
          <View style={{ gap: 12 }}>
            {sorted.map((order) => {
              const event = events.find((e) => e.id === order.eventId);
              return (
                <Pressable key={order.id} onPress={() => event && router.push(`/evento/${event.id}`)}>
                  <GlassCard level="card">
                    <View style={{ padding: 15, gap: 4 }}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.eventTitle} numberOfLines={1}>
                          {event?.title ?? "Evento"}
                        </Text>
                        <Text style={styles.amount}>{formatUsd(order.totalCents)}</Text>
                      </View>
                      <Text style={styles.meta}>
                        {event ? formatEventDate(event.startsAt) : ""} · {order.quantity} ticket
                        {order.quantity === 1 ? "" : "s"}
                      </Text>
                      <Text style={[styles.status, statusColor(order.status)]}>{STATUS_LABEL[order.status]}</Text>
                    </View>
                  </GlassCard>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function statusColor(status: OrderStatus) {
  if (status === "paid") return { color: color.pink };
  if (status === "rejected" || status === "expired" || status === "cancelled" || status === "refunded") return { color: color.text4 };
  return { color: color.text3 };
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
    fontSize: 17,
    color: color.text,
  },
  section: {
    paddingHorizontal: spacing.screenX,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 14.5,
    color: color.text,
    flex: 1,
    marginRight: 10,
  },
  amount: {
    fontFamily: fontFamily.extraBold,
    fontSize: 14.5,
    color: color.text,
  },
  meta: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: color.text3,
  },
  status: {
    fontFamily: fontFamily.extraBold,
    fontSize: 10.5,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginTop: 2,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: 13.5,
    color: color.text3,
    textAlign: "center",
    marginTop: 30,
  },
});
