import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../../src/components/GlassCard";
import { ChevronRight, HeartIcon } from "../../src/components/icons";
import { PrimaryButton } from "../../src/components/Button";
import { useAppStore } from "../../src/context/AppStore";
import { getNextTier } from "../../src/core/loyalty";
import { color, fontFamily, spacing } from "../../src/theme/tokens";

function Row({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        <ChevronRight />
      </View>
    </Pressable>
  );
}

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { favorites, orders, points, tier, organizerStatus, userEmail, signOut } = useAppStore();

  const soon = (label: string) => () => Alert.alert(label, "Todavía no está listo en este prototipo.");
  const initials = (userEmail ?? "PL").slice(0, 2).toUpperCase();
  const paidOrders = orders.filter((o) => o.status === "paid").length;

  const nextTier = getNextTier(points);
  const progress = nextTier ? Math.min(1, (points - tier.threshold) / (nextTier.threshold - tier.threshold)) : 1;

  function handleOrganizerPress() {
    router.push(organizerStatus === "verified" ? "/organizador" : "/organizador/activar");
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 140 }}>
      <Text style={styles.screenTitle}>Perfil</Text>

      <View style={styles.section}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View>
            <Text style={styles.email}>{userEmail}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Pressable onPress={() => router.push("/perfil/nivel")}>
          <GlassCard level="card">
            <View style={{ padding: 16 }}>
              <View style={styles.tierHeaderRow}>
                <Text style={styles.tierName}>{tier.name}</Text>
                <View style={styles.tierChevronRow}>
                  <Text style={styles.tierPoints}>{points} pts</Text>
                  <ChevronRight />
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={styles.tierHint}>
                {nextTier
                  ? `Te faltan ${nextTier.threshold - points} puntos para ${nextTier.name}`
                  : "Llegaste al nivel más alto"}
              </Text>
            </View>
          </GlassCard>
        </Pressable>
      </View>

      <View style={styles.section}>
        <GlassCard level="card">
          <View style={styles.statsRow}>
            <Pressable style={styles.stat} onPress={() => router.push("/perfil/historial")}>
              <Text style={styles.statValue}>{paidOrders}</Text>
              <Text style={styles.statLabel}>Compras</Text>
            </Pressable>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <HeartIcon active size={18} />
              <Text style={[styles.statValue, { marginTop: 4 }]}>{favorites.length}</Text>
              <Text style={styles.statLabel}>Favoritos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{points}</Text>
              <Text style={styles.statLabel}>Puntos Plann</Text>
            </View>
          </View>
        </GlassCard>
      </View>

      <View style={styles.section}>
        <GlassCard level="card">
          <Row label="Historial de compras" value={`${paidOrders}`} onPress={() => router.push("/perfil/historial")} />
          <Divider />
          <Row label="Mi nivel y puntos" value={tier.name} onPress={() => router.push("/perfil/nivel")} />
          <Divider />
          <Row label="Mis reseñas" onPress={soon("Mis reseñas")} />
          <Divider />
          <Row label="Métodos de pago" onPress={soon("Métodos de pago")} />
          <Divider />
          <Row label="Invitar amigos" value="+$1 de saldo" onPress={soon("Invitar amigos")} />
          <Divider />
          <Row label="Notificaciones" onPress={soon("Notificaciones")} />
          <Divider />
          <Row label="Ayuda y soporte" onPress={soon("Ayuda y soporte")} />
        </GlassCard>
      </View>

      <View style={styles.section}>
        <PrimaryButton
          label={organizerStatus === "verified" ? "Modo organizador" : "Convertirme en organizador"}
          onPress={handleOrganizerPress}
        />
        {organizerStatus === "pending" && <Text style={styles.pendingHint}>Tu verificación está en revisión.</Text>}
      </View>

      <View style={styles.section}>
        <Pressable onPress={() => signOut()}>
          <Text style={styles.logout}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  screenTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 26,
    letterSpacing: -0.5,
    color: color.text,
    paddingHorizontal: spacing.screenX,
    marginBottom: 16,
  },
  section: {
    paddingHorizontal: spacing.screenX,
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: color.pink,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
    color: color.white,
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    color: color.text,
  },
  email: {
    fontFamily: fontFamily.regular,
    fontSize: 12.5,
    color: color.text3,
  },
  tierHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  tierName: {
    fontFamily: fontFamily.extraBold,
    fontSize: 17,
    color: color.text,
  },
  tierChevronRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tierPoints: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: color.pink,
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  progressFill: {
    height: 7,
    backgroundColor: color.pink,
  },
  tierHint: {
    marginTop: 8,
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: color.text3,
  },
  statsRow: {
    flexDirection: "row",
    paddingVertical: 16,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  statValue: {
    fontFamily: fontFamily.extraBold,
    fontSize: 17,
    color: color.text,
  },
  statLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: color.text3,
  },
  row: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: color.text,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12.5,
    color: color.pink,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginLeft: 16,
  },
  pendingHint: {
    marginTop: 8,
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: color.text3,
    textAlign: "center",
  },
  logout: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: color.text3,
    textAlign: "center",
  },
});
