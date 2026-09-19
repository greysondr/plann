import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { GlassCard } from "../../../src/components/GlassCard";
import { OrganizerHeader } from "../../../src/components/OrganizerHeader";
import { PrimaryButton } from "../../../src/components/Button";
import { ChevronRight } from "../../../src/components/icons";
import { useAppStore } from "../../../src/context/AppStore";
import { useOrganizerGuard } from "../../../src/hooks/useOrganizerGuard";
import { setLastMode } from "../../../src/lib/mode";
import { formatUsd } from "../../../src/core/pricing";
import { color, fontFamily, spacing } from "../../../src/theme/tokens";

function Row({ label, hint, onPress }: { label: string; hint?: string; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint && <Text style={styles.rowHint}>{hint}</Text>}
      </View>
      <ChevronRight color={color.text3} />
    </Pressable>
  );
}

const Divider = () => <View style={styles.divider} />;

export default function MasScreen() {
  const allowed = useOrganizerGuard();
  const router = useRouter();
  const { balance, staff, events, myOrganizerId, organizerProfile, signOut, unreadCount, coupons, ratingSummary, followerCount } = useAppStore();
  if (!allowed) return null;

  const active = events.filter((e) => e.organizerId === myOrganizerId && ["published", "sold_out", "live"].includes(e.status ?? "")).length;

  return (
    <View style={{ flex: 1 }}>
      <OrganizerHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: 150 }}>
        <View style={styles.section}>
          <Text style={styles.title}>Más herramientas</Text>
        </View>

        <View style={styles.section}>
          <PrimaryButton label="Publicar un evento" onPress={() => router.push("/organizador/crear")} />
        </View>

        <View style={styles.section}>
          <Text style={styles.groupTitle}>Día del evento</Text>
          <GlassCard level="card">
            <Row label="Escanear entradas" hint="Valida los QR en la puerta" onPress={() => router.push("/organizador/escanear")} />
            <Divider />
            <Row label="Equipo de puerta" hint={staff.length === 0 ? "Invita a quien valida por ti" : `${staff.length} ${staff.length === 1 ? "persona" : "personas"}`} onPress={() => router.push("/organizador/equipo")} />
          </GlassCard>
        </View>

        <View style={styles.section}>
          <Text style={styles.groupTitle}>Tu negocio</Text>
          <GlassCard level="card">
            <Row label="Retiros y finanzas" hint={`${formatUsd(balance.availableCents)} disponibles`} onPress={() => router.push("/organizador/retiros")} />
            <Divider />
            <Row label="Mis eventos" hint={`${active} activos`} onPress={() => router.push("/organizador/eventos")} />
            <Divider />
            <Row label="Ventas y pedidos" hint="Filtra y consulta cada pedido" onPress={() => router.push("/organizador/ventas")} />
            <Divider />
            <Row label="Reseñas" hint={ratingSummary.count ? `★ ${ratingSummary.avg?.toFixed(1)} · ${ratingSummary.count} reseñas · ${followerCount} seguidores` : `${followerCount} seguidores`} onPress={() => router.push("/organizador/resenas")} />
            <Divider />
            <Row label="Comparar eventos" hint="Cuál vende más y cuál convierte mejor" onPress={() => router.push("/organizador/comparar")} />
            <Divider />
            <Row label="Reportes" hint="Resumen mensual para tu contabilidad" onPress={() => router.push("/organizador/reportes")} />
            <Divider />
            <Row label="Cupones" hint={coupons.length === 0 ? "Descuentos para tus compradores" : `${coupons.filter((c) => c.active).length} activos`} onPress={() => router.push("/organizador/cupones")} />
            <Divider />
            <Row label="Mi negocio" hint={organizerProfile?.name ?? "Perfil, logo y cuenta de cobro"} onPress={() => router.push("/organizador/negocio")} />
          </GlassCard>
        </View>

        <View style={styles.section}>
          <Text style={styles.groupTitle}>Cuenta</Text>
          <GlassCard level="card">
            <Row label="Notificaciones" hint={unreadCount > 0 ? `${unreadCount} sin leer` : "Ventas, cupos, retiros y más"} onPress={() => router.push("/notificaciones")} />
            <Divider />
            <Row label="Cambiar a modo comprador" hint="Explora y compra entradas" onPress={() => {
                setLastMode("buyer");
                router.replace("/");
              }}
            />
            <Divider />
            <Row
              label="Cerrar sesión"
              onPress={() =>
                Alert.alert("Cerrar sesión", "¿Quieres salir de tu cuenta?", [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Salir", style: "destructive", onPress: () => signOut() },
                ])
              }
            />
          </GlassCard>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: spacing.screenX, marginBottom: 20 },
  title: { fontFamily: fontFamily.extraBold, fontSize: 22, color: color.text },
  groupTitle: { fontFamily: fontFamily.bold, fontSize: 12.5, color: color.text3, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 15, gap: 10 },
  rowLabel: { fontFamily: fontFamily.bold, fontSize: 15, color: color.text },
  rowHint: { fontFamily: fontFamily.regular, fontSize: 12, color: color.text3, marginTop: 2 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginLeft: 16 },
});
