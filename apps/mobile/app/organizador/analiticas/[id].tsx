import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../../../src/components/GlassCard";
import { AreaChart, ColumnChart } from "../../../src/components/charts";
import { ChevronRight } from "../../../src/components/icons";
import { useAppStore, useEvent } from "../../../src/context/AppStore";
import { useOrganizerGuard } from "../../../src/hooks/useOrganizerGuard";
import { attendance, checkinsByHour, cumulativeTickets, eventSettlements, funnel, sumBy, totalViews, viewToPurchaseRate, viewsSeries } from "../../../src/core/orgAnalytics";
import { formatUsd } from "../../../src/core/pricing";
import { formatEventDate } from "../../../src/utils/format";
import { color, fontFamily, spacing } from "../../../src/theme/tokens";

export default function AnaliticasEventoScreen() {
  const allowed = useOrganizerGuard();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const event = useEvent(id);
  const { analyticsOrders, analyticsTickets, analyticsViews, setSalesPaused } = useAppStore();

  const data = useMemo(() => {
    const orders = analyticsOrders.filter((o) => o.event_id === id);
    const tickets = analyticsTickets.filter((t) => t.event_id === id);
    const paid = orders.filter((o) => o.status === "paid");
    return {
      orders,
      net: paid.reduce((s, o) => s + o.organizer_net_cents, 0),
      gross: paid.reduce((s, o) => s + o.subtotal_cents, 0),
      fun: funnel(orders),
      att: attendance(tickets),
      trend: cumulativeTickets(orders, event?.status === "finished" ? new Date(event.startsAt) : new Date()),
      arrivals: checkinsByHour(tickets),
      settlement: eventSettlements(orders).get(id),
      views: totalViews(analyticsViews, id),
      viewsRate: viewToPurchaseRate(paid.length, totalViews(analyticsViews, id)),
      viewsSeries: viewsSeries(analyticsViews, 30, new Date(), id),
      byType: sumBy(orders, (o) => o.ticket_type_id, new Map((event?.ticketTypes ?? []).map((t) => [t.id, t.name]))),
    };
  }, [analyticsOrders, analyticsTickets, analyticsViews, id, event]);

  if (!allowed || !event) return null;

  const sold = event.ticketTypes.reduce((s, t) => s + t.sold, 0);
  const cap = event.ticketTypes.reduce((s, t) => s + t.quantity, 0);
  const closed = event.status === "cancelled" || event.status === "finished";

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 60 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ChevronRight color={color.text} />
          </View>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          Analíticas
        </Text>
        <View style={{ width: 18 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.meta}>
          {formatEventDate(event.startsAt)}
          {event.status === "cancelled" ? " · Cancelado" : event.status === "finished" ? " · Finalizado" : event.salesPaused ? " · Ventas pausadas" : ""}
        </Text>
      </View>

      {event.status === "cancelled" && (
        <View style={styles.section}>
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>Evento cancelado: {event.cancelReason ?? "sin motivo"}. Los pagos confirmados quedaron por reembolsar y ya no cuentan en tu saldo.</Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.grid}>
          <Kpi label="Ingresos netos" value={formatUsd(data.net)} hint={`${formatUsd(data.gross)} brutos`} />
          <Kpi label="Entradas vendidas" value={`${sold}/${cap}`} hint={`${cap ? Math.round((sold / cap) * 100) : 0}% del cupo`} />
          <Kpi label="Conversión" value={`${Math.round(data.fun.conversion * 100)}%`} hint={`${data.fun.expired + data.fun.cancelled} sin concretar`} />
          <Kpi label="Asistencia" value={data.att.used > 0 ? `${Math.round(data.att.rate * 100)}%` : "—"} hint={`${data.att.used} de ${data.att.issued} entraron`} />
          <Kpi label="Visitas" value={String(data.views)} hint={data.viewsRate === null ? "sin visitas aún" : `${Math.round(data.viewsRate * 100)}% compró`} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Evolución de ventas</Text>
        <GlassCard level="card">
          <View style={{ padding: 16 }}>
            {data.trend.length === 0 ? (
              <Text style={styles.empty}>Aún no hay ventas.</Text>
            ) : (
              <AreaChart data={data.trend.map((p) => ({ label: p.label, value: p.tickets }))} />
            )}
          </View>
        </GlassCard>
      </View>

      {data.views > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visitas por día</Text>
          <GlassCard level="card">
            <View style={{ padding: 16 }}>
              <ColumnChart data={data.viewsSeries.slice(-14).map((v) => ({ label: v.label, value: v.views }))} />
            </View>
          </GlassCard>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Liquidación</Text>
        <GlassCard level="card">
          <View style={{ padding: 16, gap: 10 }}>
            <SettleRow label="Bruto (precio de lista)" value={formatUsd(data.settlement?.grossCents ?? 0)} />
            <SettleRow label="Cupones" value={data.settlement?.discountCents ? `−${formatUsd(data.settlement.discountCents)}` : "—"} />
            <SettleRow label="Comisión de Plann" value={`−${formatUsd(data.settlement?.commissionCents ?? 0)}`} />
            <SettleRow label={`Reembolsos (${data.settlement?.refundedOrders ?? 0})`} value={data.settlement?.refundedCents ? formatUsd(data.settlement.refundedCents) : "—"} />
            <View style={styles.settleDivider} />
            <SettleRow label="Neto para ti" value={formatUsd(data.settlement?.netCents ?? 0)} strong />
          </View>
        </GlassCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Por tipo de entrada</Text>
        <GlassCard level="card">
          <View style={{ padding: 16, gap: 16 }}>
            {event.ticketTypes.map((t) => {
              const revenue = data.byType.find((s) => s.id === t.id)?.netCents ?? 0;
              return (
                <View key={t.id} style={{ gap: 6 }}>
                  <View style={styles.typeRow}>
                    <Text style={styles.typeName}>{t.name}</Text>
                    <Text style={styles.meta}>{t.priceCents === 0 ? "Gratis" : formatUsd(t.priceCents)}</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${t.quantity ? Math.min(1, t.sold / t.quantity) * 100 : 0}%` }]} />
                  </View>
                  <View style={styles.typeRow}>
                    <Text style={styles.meta}>
                      {t.sold} de {t.quantity}
                      {t.reserved > 0 ? ` · ${t.reserved} reservadas` : ""}
                    </Text>
                    <Text style={styles.typeRevenue}>{formatUsd(revenue)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </GlassCard>
      </View>

      {data.arrivals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Llegada de asistentes</Text>
          <GlassCard level="card">
            <View style={{ padding: 16 }}>
              <ColumnChart data={data.arrivals.map((a) => ({ label: a.label, value: a.count }))} />
            </View>
          </GlassCard>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.actions}>
          <Pressable style={styles.action} onPress={() => router.push(`/organizador/asistentes/${event.id}`)}>
            <Text style={styles.actionText}>Ver asistentes</Text>
          </Pressable>
          {!closed && (
            <Pressable style={styles.action} onPress={() => router.push(`/organizador/editar/${event.id}`)}>
              <Text style={styles.actionText}>Editar evento</Text>
            </Pressable>
          )}
          {!closed && (
            <Pressable style={styles.action} onPress={() => setSalesPaused(event.id, !event.salesPaused)}>
              <Text style={styles.actionText}>{event.salesPaused ? "Reanudar ventas" : "Pausar ventas"}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function SettleRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.typeRow}>
      <Text style={strong ? styles.settleStrong : styles.meta}>{label}</Text>
      <Text style={strong ? [styles.settleStrong, { color: color.pink }] : styles.settleValue}>{value}</Text>
    </View>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <GlassCard level="card" style={{ width: "47.5%" }}>
      <View style={{ padding: 14, gap: 4 }}>
        <Text style={styles.meta}>{label}</Text>
        <Text style={styles.kpiValue}>{value}</Text>
        {hint && (
          <Text style={styles.meta} numberOfLines={1}>
            {hint}
          </Text>
        )}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.screenX, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  title: { fontFamily: fontFamily.extraBold, fontSize: 18, color: color.text },
  section: { paddingHorizontal: spacing.screenX, marginBottom: 20 },
  sectionTitle: { fontFamily: fontFamily.extraBold, fontSize: 16, color: color.text, marginBottom: 10 },
  eventTitle: { fontFamily: fontFamily.extraBold, fontSize: 20, color: color.text },
  meta: { fontFamily: fontFamily.semiBold, fontSize: 11.5, color: color.text3 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpiValue: { fontFamily: fontFamily.extraBold, fontSize: 20, color: color.text },
  empty: { fontFamily: fontFamily.regular, fontSize: 13, color: color.text3 },
  alertBox: { padding: 14, borderRadius: 24, backgroundColor: "rgba(233,65,127,0.10)", borderWidth: 1, borderColor: "rgba(233,65,127,0.30)" },
  alertText: { fontFamily: fontFamily.semiBold, fontSize: 12.5, lineHeight: 18, color: color.text2 },
  settleDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  settleValue: { fontFamily: fontFamily.bold, fontSize: 13.5, color: color.text },
  settleStrong: { fontFamily: fontFamily.extraBold, fontSize: 14.5, color: color.text },
  typeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  typeName: { fontFamily: fontFamily.bold, fontSize: 14, color: color.text },
  typeRevenue: { fontFamily: fontFamily.extraBold, fontSize: 12.5, color: color.pink },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.10)", overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: color.pink },
  actions: { gap: 10 },
  action: { minHeight: 46, borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  actionText: { fontFamily: fontFamily.bold, fontSize: 14, color: color.text },
});
