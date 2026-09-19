import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { GlassCard } from "../../../src/components/GlassCard";
import { Chip } from "../../../src/components/Chip";
import { OrganizerHeader } from "../../../src/components/OrganizerHeader";
import { useAppStore } from "../../../src/context/AppStore";
import { useOrganizerGuard } from "../../../src/hooks/useOrganizerGuard";
import { funnel } from "../../../src/core/orgAnalytics";
import { formatUsd } from "../../../src/core/pricing";
import { formatShortDate } from "../../../src/utils/format";
import { color, fontFamily, spacing } from "../../../src/theme/tokens";

const STATES: { id: string; label: string; match: (s: string) => boolean }[] = [
  { id: "todos", label: "Todos", match: () => true },
  { id: "paid", label: "Pagados", match: (s) => s === "paid" },
  { id: "pendientes", label: "Pendientes", match: (s) => s === "pending_payment" || s === "in_verification" },
  { id: "sin", label: "Sin concretar", match: (s) => s === "expired" || s === "cancelled" },
  { id: "reembolsos", label: "Reembolsos", match: (s) => s === "refund_pending" || s === "refunded" || s === "partially_refunded" },
];

const ORDER_LABEL: Record<string, string> = {
  paid: "Pagada",
  pending_payment: "Pendiente de pago",
  in_verification: "Verificando pago",
  expired: "Expirada",
  cancelled: "Cancelada",
  refund_pending: "Por reembolsar",
  refunded: "Reembolsada",
};

const PAGE = 30;

export default function VentasScreen() {
  const allowed = useOrganizerGuard();
  const router = useRouter();
  const { events, myOrganizerId, analyticsOrders, organizerProfile } = useAppStore();
  const [state, setState] = useState("todos");
  const [eventId, setEventId] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);

  const mine = useMemo(() => events.filter((e) => e.organizerId === myOrganizerId), [events, myOrganizerId]);
  const titles = useMemo(() => new Map(mine.map((e) => [e.id, e.title])), [mine]);
  const typeNames = useMemo(() => new Map(mine.flatMap((e) => e.ticketTypes.map((t) => [t.id, t.name] as const))), [mine]);

  const scoped = useMemo(() => {
    const match = STATES.find((s) => s.id === state)!.match;
    return analyticsOrders.filter((o) => (!eventId || o.event_id === eventId) && match(o.status));
  }, [analyticsOrders, state, eventId]);

  const totals = useMemo(() => {
    const paid = scoped.filter((o) => o.status === "paid");
    return {
      gross: paid.reduce((s, o) => s + o.subtotal_cents, 0),
      commission: paid.reduce((s, o) => s + o.commission_cents, 0),
      net: paid.reduce((s, o) => s + o.organizer_net_cents, 0),
      fun: funnel(analyticsOrders.filter((o) => !eventId || o.event_id === eventId)),
    };
  }, [scoped, analyticsOrders, eventId]);

  if (!allowed) return null;

  return (
    <View style={{ flex: 1 }}>
      <OrganizerHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: 150 }}>
      <View style={styles.titleRow}>
        <Text style={styles.pageTitle}>Ventas y pedidos</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.grid}>
          <Kpi label="Venta bruta" value={formatUsd(totals.gross)} />
          <Kpi label={`Comisión Plann ${Math.round((organizerProfile?.commissionRate ?? 0.12) * 100)}%`} value={formatUsd(totals.commission)} />
          <Kpi label="Neto para ti" value={formatUsd(totals.net)} />
          <Kpi label="Conversión" value={`${Math.round(totals.fun.conversion * 100)}%`} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {STATES.map((s) => (
          <Chip key={s.id} label={s.label} selected={state === s.id} onPress={() => { setState(s.id); setShown(PAGE); }} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="Todos los eventos" selected={!eventId} onPress={() => { setEventId(null); setShown(PAGE); }} />
        {mine.map((e) => (
          <Chip key={e.id} label={e.title.length > 24 ? `${e.title.slice(0, 23)}…` : e.title} selected={eventId === e.id} onPress={() => { setEventId(e.id); setShown(PAGE); }} />
        ))}
      </ScrollView>

      <View style={styles.section}>
        <Text style={styles.count}>{scoped.length} pedidos</Text>
        {scoped.length === 0 ? (
          <Text style={styles.empty}>No hay pedidos con estos filtros.</Text>
        ) : (
          <GlassCard level="card">
            {scoped.slice(0, shown).map((o, i) => (
              <View key={o.id}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.row}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {o.quantity} × {typeNames.get(o.ticket_type_id) ?? "Entrada"} · {titles.get(o.event_id) ?? "Evento"}
                    </Text>
                    <Text style={styles.meta}>
                      {formatShortDate(o.paid_at ?? o.created_at)} · {ORDER_LABEL[o.status] ?? o.status}
                      {o.status === "paid" && o.currency_paid ? ` · ${o.currency_paid === "bs" ? "Bs" : "USD"}` : ""}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.net, o.status !== "paid" && { color: color.text4 }]}>{o.status === "paid" ? formatUsd(o.organizer_net_cents) : "—"}</Text>
                    {o.status === "paid" && <Text style={styles.meta}>de {formatUsd(o.subtotal_cents)}</Text>}
                  </View>
                </View>
              </View>
            ))}
          </GlassCard>
        )}
        {scoped.length > shown && (
          <Pressable style={styles.more} onPress={() => setShown((n) => n + PAGE)}>
            <Text style={styles.moreText}>Ver más</Text>
          </Pressable>
        )}
      </View>
      </ScrollView>
    </View>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <GlassCard level="card" style={{ width: "47.5%" }}>
      <View style={{ padding: 14, gap: 4 }}>
        <Text style={styles.meta}>{label}</Text>
        <Text style={styles.kpiValue}>{value}</Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.screenX, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  titleRow: { paddingHorizontal: spacing.screenX, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  pageTitle: { fontFamily: fontFamily.extraBold, fontSize: 22, color: color.text },
  newButton: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: color.pink },
  newButtonText: { fontFamily: fontFamily.bold, fontSize: 13, color: color.white },
  section: { paddingHorizontal: spacing.screenX, marginBottom: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chips: { paddingHorizontal: spacing.screenX, gap: 8, marginBottom: 12 },
  kpiValue: { fontFamily: fontFamily.extraBold, fontSize: 20, color: color.text },
  count: { fontFamily: fontFamily.semiBold, fontSize: 12.5, color: color.text3, marginBottom: 8 },
  empty: { fontFamily: fontFamily.regular, fontSize: 13, color: color.text3 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  rowTitle: { fontFamily: fontFamily.bold, fontSize: 13.5, color: color.text },
  meta: { fontFamily: fontFamily.semiBold, fontSize: 11.5, color: color.text3 },
  net: { fontFamily: fontFamily.extraBold, fontSize: 14, color: color.pink },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginLeft: 16 },
  more: { alignSelf: "center", marginTop: 14, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  moreText: { fontFamily: fontFamily.bold, fontSize: 13, color: color.text2 },
});
