import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { GlassCard } from "../../../src/components/GlassCard";
import { OrganizerHeader } from "../../../src/components/OrganizerHeader";
import { InfoTip } from "../../../src/components/InfoTip";
import { ChevronRight } from "../../../src/components/icons";
import { useAppStore } from "../../../src/context/AppStore";
import { useOrganizerGuard } from "../../../src/hooks/useOrganizerGuard";
import { groupTools, searchTools, toolsFor } from "../../../src/core/orgTools";
import { setLastMode } from "../../../src/lib/mode";
import { formatUsd } from "../../../src/core/pricing";
import { color, fontFamily, radius, spacing } from "../../../src/theme/tokens";

function Row({ label, hint, badge, onPress, help }: { label: string; hint?: string; badge?: number; onPress: () => void; help?: boolean }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint && <Text style={styles.rowHint}>{hint}</Text>}
      </View>
      {help && <InfoTip label={label} size={16} />}
      {!!badge && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? "9+" : badge}</Text>
        </View>
      )}
      <ChevronRight color={color.text3} />
    </Pressable>
  );
}

const Divider = () => <View style={styles.divider} />;

export default function MasScreen() {
  const allowed = useOrganizerGuard();
  const router = useRouter();
  const { balance, staff, events, myOrganizerId, organizerProfile, signOut, unreadCount, coupons, ratingSummary, followerCount, orgRole, analyticsOrders } = useAppStore();
  const [query, setQuery] = useState("");

  const groups = useMemo(() => groupTools(searchTools(toolsFor(orgRole), query)), [orgRole, query]);
  if (!allowed) return null;

  const active = events.filter((e) => e.organizerId === myOrganizerId && ["published", "sold_out", "live"].includes(e.status ?? "")).length;
  const pendingSales = analyticsOrders.filter((o) => o.status === "pending_payment" || o.status === "in_verification").length;

  const hints: Record<string, string> = {
    eventos: `${active} ${active === 1 ? "activo" : "activos"} · editar, pausar, duplicar`,
    retiros: `${formatUsd(balance.availableCents)} disponibles`,
    equipo: staff.length === 0 ? "Invita a quien valida por ti" : `${staff.length} ${staff.length === 1 ? "persona" : "personas"}`,
    resenas: ratingSummary.count ? `★ ${ratingSummary.avg?.toFixed(1)} · ${ratingSummary.count} reseñas · ${followerCount} seguidores` : `${followerCount} seguidores`,
    cupones: coupons.length === 0 ? "Descuentos para tus compradores" : `${coupons.filter((c) => c.active).length} activos`,
    negocio: organizerProfile?.name ?? "Perfil, logo y cuenta de cobro",
    notificaciones: unreadCount > 0 ? `${unreadCount} sin leer` : "Ventas, cupos, retiros y más",
  };
  const badges: Record<string, number> = { notificaciones: unreadCount, ventas: pendingSales };

  return (
    <View style={{ flex: 1 }}>
      <OrganizerHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: 150 }} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.title}>Herramientas</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar: cupones, retiros, QR, equipo…"
            placeholderTextColor={color.text4}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            style={styles.search}
          />
        </View>

        {groups.length === 0 && (
          <View style={styles.section}>
            <Text style={styles.rowHint}>No encontramos nada con «{query}». Prueba con otra palabra.</Text>
          </View>
        )}

        {groups.map(({ group, tools }) => (
          <View key={group} style={styles.section}>
            <Text style={styles.groupTitle}>{group}</Text>
            <GlassCard level="card">
              {tools.map((tool, i) => (
                <View key={tool.id}>
                  {i > 0 && <Divider />}
                  <Row help label={tool.label} hint={hints[tool.id] ?? tool.hint} badge={badges[tool.id]} onPress={() => router.push(tool.route as never)} />
                </View>
              ))}
            </GlassCard>
          </View>
        ))}

        {query.trim() === "" && (
          <View style={styles.section}>
            <Text style={styles.groupTitle}>Sesión</Text>
            <GlassCard level="card">
              <Row
                label="Cambiar a modo comprador"
                hint="Explora y compra entradas"
                onPress={() => {
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
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: spacing.screenX, marginBottom: 20 },
  title: { fontFamily: fontFamily.extraBold, fontSize: 22, color: color.text, marginBottom: 12 },
  search: { height: 48, borderRadius: radius.field, paddingHorizontal: 16, backgroundColor: "rgba(255,255,255,0.09)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", fontFamily: fontFamily.regular, fontSize: 14, color: color.text },
  groupTitle: { fontFamily: fontFamily.bold, fontSize: 12.5, color: color.text3, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 15, gap: 10 },
  rowLabel: { fontFamily: fontFamily.bold, fontSize: 15, color: color.text },
  rowHint: { fontFamily: fontFamily.regular, fontSize: 12, color: color.text3, marginTop: 2 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginLeft: 16 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: color.pink, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  badgeText: { fontFamily: fontFamily.extraBold, fontSize: 11.5, color: color.white },
});
