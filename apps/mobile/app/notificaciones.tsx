import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../src/components/GlassCard";
import { ChevronRight } from "../src/components/icons";
import { useAppStore, type AppNotification } from "../src/context/AppStore";
import { timeAgo } from "../src/utils/format";
import { color, fontFamily, spacing } from "../src/theme/tokens";
import { InfoTip } from "../src/components/InfoTip";

export default function NotificacionesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notifications, unreadCount, markNotificationsRead } = useAppStore();

  function open(n: AppNotification) {
    if (!n.readAt) markNotificationsRead([n.id]);
    const route = n.data?.route;
    if (typeof route === "string" && route.startsWith("/")) router.push(route as never);
  }

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 60 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ChevronRight color={color.text} />
          </View>
        </Pressable>
        <Text style={styles.title}>Notificaciones</Text>
        <InfoTip label="Notificaciones" size={18} />
      </View>

      {unreadCount > 0 && (
        <View style={styles.section}>
          <Pressable onPress={() => markNotificationsRead()}>
            <Text style={styles.link}>Marcar {unreadCount === 1 ? "la nueva" : `las ${unreadCount} nuevas`} como {unreadCount === 1 ? "leída" : "leídas"}</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.section}>
        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Todavía no tienes notificaciones</Text>
            <Text style={styles.emptyText}>Aquí verás tus pagos aprobados, recordatorios de tus eventos y, si eres organizador, tus ventas.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {notifications.map((n) => (
              <GlassCard key={n.id} level="card">
                <Pressable style={styles.card} onPress={() => open(n)}>
                  <View style={[styles.dot, !n.readAt && styles.dotUnread]} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[styles.cardTitle, n.readAt && { color: color.text2 }]}>{n.title}</Text>
                    <Text style={styles.cardBody}>{n.body}</Text>
                    <Text style={styles.time}>{timeAgo(n.createdAt)}</Text>
                  </View>
                </Pressable>
              </GlassCard>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.screenX, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  title: { fontFamily: fontFamily.extraBold, fontSize: 18, color: color.text },
  section: { paddingHorizontal: spacing.screenX, marginBottom: 14 },
  link: { fontFamily: fontFamily.bold, fontSize: 13, color: color.pink },
  card: { flexDirection: "row", gap: 12, padding: 14, alignItems: "flex-start" },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 6, backgroundColor: "transparent" },
  dotUnread: { backgroundColor: color.pink },
  cardTitle: { fontFamily: fontFamily.bold, fontSize: 14.5, color: color.text },
  cardBody: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19, color: color.text2 },
  time: { fontFamily: fontFamily.semiBold, fontSize: 11.5, color: color.text3, marginTop: 2 },
  empty: { padding: 20, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", alignItems: "center" },
  emptyTitle: { fontFamily: fontFamily.bold, fontSize: 14.5, color: color.text, textAlign: "center" },
  emptyText: { fontFamily: fontFamily.regular, fontSize: 12.5, color: color.text3, textAlign: "center", marginTop: 6, lineHeight: 18 },
});
