import React, { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../../src/components/GlassCard";
import { Chip } from "../../src/components/Chip";
import { AreaChart, BarList, ColumnChart } from "../../src/components/charts";
import { ChevronRight, ScanIcon } from "../../src/components/icons";
import { PrimaryButton } from "../../src/components/Button";
import { useAppStore } from "../../src/context/AppStore";
import { useOrganizerGuard } from "../../src/hooks/useOrganizerGuard";
import { formatEventDate, formatShortDate } from "../../src/utils/format";
import { formatUsd } from "../../src/core/pricing";
import {
  attendance,
  buyerStats,
  dailySeries,
  deltaPct,
  funnel,
  sumBy,
  totalsBetween,
  weekdayDistribution,
} from "../../src/core/orgAnalytics";
import { color, fontFamily, radius, spacing } from "../../src/theme/tokens";

const DAY = 24 * 3600 * 1000;
const PLAN_LABEL: Record<string, string> = { basico: "Plan Básico", pro: "Plan Pro", business: "Plan Business" };
const ORDER_LABEL: Record<string, string> = {
  paid: "Pagada",
  pending_payment: "Pendiente",
  in_verification: "Verificando",
  expired: "Expirada",
  cancelled: "Cancelada",
  refund_pending: "Por reembolsar",
  refunded: "Reembolsada",
};

function delta(d: number | null): { text: string; up: boolean } | null {
  if (d === null) return { text: "nuevo", up: true };
  if (d === 0) return null;
  return { text: `${d > 0 ? "+" : "−"}${Math.round(Math.abs(d) * 100)}%`, up: d > 0 };
}

function Kpi({ label, value, hint, change }: { label: string; value: string; hint?: string; change?: { text: string; up: boolean } | null }) {
  return (
    <GlassCard level="card" style={styles.kpiCard}>
      <View style={styles.kpiInner}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <Text style={styles.kpiValue}>{value}</Text>
        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
          {change && <Text style={[styles.kpiChange, !change.up && { color: color.text3 }]}>{change.text}</Text>}
          {hint && (
            <Text style={styles.kpiHint} numberOfLines={1}>
              {hint}
            </Text>
          )}
        </View>
      </View>
    </GlassCard>
  );
}

function MenuRow({ label, hint, onPress }: { label: string; hint?: string; onPress: () => void }) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuLabel}>{label}</Text>
        {hint && <Text style={styles.menuHint}>{hint}</Text>}
      </View>
      <ChevronRight color={color.text3} />
    </Pressable>
  );
}

export default function OrganizadorScreen() {
  const allowed = useOrganizerGuard();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { events, organizerProfile, myOrganizerId, balance, analyticsOrders, analyticsTickets, staff } = useAppStore();
  const [range, setRange] = useState(30);

  const myEvents = useMemo(() => events.filter((e) => e.organizerId === myOrganizerId), [events, myOrganizerId]);

  const stats = useMemo(() => {
    const now = new Date();
    const cur = totalsBetween(analyticsOrders, new Date(now.getTime() - range * DAY), new Date(now.getTime() + 1));
    const prev = totalsBetween(analyticsOrders, new Date(now.getTime() - 2 * range * DAY), new Date(now.getTime() - range * DAY));
    const inRange = analyticsOrders.filter((o) => new Date(o.created_at).getTime() >= now.getTime() - range * DAY);
    const names = new Map(myEvents.map((e) => [e.id, e.title]));
    const finishedIds = new Set(myEvents.filter((e) => e.status === "finished").map((e) => e.id));
    return {
      cur,
      prev,
      series: dailySeries(analyticsOrders, range, now),
      fun: funnel(inRange),
      buyers: buyerStats(analyticsOrders),
      att: attendance(analyticsTickets.filter((t) => finishedIds.has(t.event_id))),
      byEvent: sumBy(inRange, (o) => o.event_id, names).slice(0, 5),
      weekday: weekdayDistribution(inRange),
      pending: analyticsOrders.filter((o) => o.status === "pending_payment" || o.status === "in_verification").length,
      names,
    };
  }, [analyticsOrders, analyticsTickets, myEvents, range]);

  if (!allowed) return null;

  const upcoming = myEvents
    .filter((e) => ["published", "sold_out", "live"].includes(e.status ?? "") && new Date(e.startsAt).getTime() >= Date.now() - DAY)
    .sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1))
    .slice(0, 3);
  const avgOrder = stats.cur.orders > 0 ? stats.cur.grossCents / stats.cur.orders : 0;
  const netChange = delta(deltaPct(stats.cur.netCents, stats.prev.netCents));
  const ticketsChange = delta(deltaPct(stats.cur.tickets, stats.prev.tickets));
  const activeEvents = myEvents.filter((e) => ["published", "sold_out", "live"].includes(e.status ?? "")).length;

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

      <View style={[styles.section, styles.identity]}>
        {organizerProfile?.logoUrl ? (
          <Image source={{ uri: organizerProfile.logoUrl }} style={styles.logo} />
        ) : (
          <View style={[styles.logo, styles.logoFallback]}>
            <Text style={styles.logoInitial}>{(organizerProfile?.name ?? "P").slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.organizerName} numberOfLines={1}>
            {organizerProfile?.name ?? "Tu negocio"}
          </Text>
          <Text style={styles.organizerPlan}>{PLAN_LABEL[organizerProfile?.plan ?? "basico"]}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <GlassCard level="card">
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.kpiLabel}>Saldo disponible</Text>
              <Text style={styles.balanceValue}>{formatUsd(balance.availableCents)}</Text>
              {balance.pendingCents > 0 && <Text style={styles.kpiHint}>{formatUsd(balance.pendingCents)} en proceso de pago</Text>}
            </View>
            <Pressable style={styles.withdrawButton} onPress={() => router.push("/organizador/retiros")}>
              <Text style={styles.withdrawButtonText}>Retirar</Text>
            </Pressable>
          </View>
        </GlassCard>
      </View>

      {stats.pending > 0 && (
        <View style={styles.section}>
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>
              {stats.pending === 1 ? "1 compra está pendiente" : `${stats.pending} compras están pendientes`} de pago o verificación. Se acreditan a tu saldo cuando Plann confirma el pago.
            </Text>
          </View>
        </View>
      )}

      <View style={[styles.section, styles.rangeRow]}>
        {[7, 30, 90].map((d) => (
          <Chip key={d} label={`${d} días`} selected={range === d} onPress={() => setRange(d)} />
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.grid}>
          <Kpi label="Ingresos netos" value={formatUsd(stats.cur.netCents)} change={netChange} hint={`vs ${formatUsd(stats.prev.netCents)}`} />
          <Kpi label="Entradas vendidas" value={String(stats.cur.tickets)} change={ticketsChange} hint={`${stats.cur.orders} pedidos`} />
          <Kpi label="Pedido promedio" value={formatUsd(avgOrder)} hint="antes de comisión" />
          <Kpi label="Conversión" value={`${Math.round(stats.fun.conversion * 100)}%`} hint={`${stats.fun.paid} de ${stats.fun.total - stats.fun.pending}`} />
          <Kpi
            label="Asistencia"
            value={stats.att.issued > 0 ? `${Math.round(stats.att.rate * 100)}%` : "—"}
            hint={stats.att.issued > 0 ? "eventos finalizados" : "sin finalizados"}
          />
          <Kpi label="Compradores" value={String(stats.buyers.buyers)} hint={`${Math.round(stats.buyers.repeatRate * 100)}% recurrentes`} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ventas por día</Text>
        <GlassCard level="card">
          <View style={{ padding: 16 }}>
            {stats.cur.orders + stats.prev.orders === 0 ? (
              <Text style={styles.empty}>Todavía no hay ventas en este período.</Text>
            ) : (
              <AreaChart data={stats.series.map((p) => ({ label: p.label, value: p.netCents / 100 }))} format={(v) => `$${Math.round(v)}`} />
            )}
          </View>
        </GlassCard>
      </View>

      {stats.byEvent.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingresos por evento</Text>
          <GlassCard level="card">
            <View style={{ padding: 16 }}>
              <BarList data={stats.byEvent.map((s) => ({ name: s.name, value: s.netCents }))} format={formatUsd} />
            </View>
          </GlassCard>
        </View>
      )}

      {stats.cur.tickets > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuándo compran</Text>
          <GlassCard level="card">
            <View style={{ padding: 16 }}>
              <ColumnChart data={stats.weekday.map((d) => ({ label: d.label, value: d.tickets }))} />
            </View>
          </GlassCard>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.actionsRow}>
          <PrimaryButton label="Publicar evento" onPress={() => router.push("/organizador/crear")} style={{ flex: 1 }} />
          <Pressable style={styles.scanButton} onPress={() => router.push("/organizador/escanear")}>
            <ScanIcon size={20} />
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Próximos eventos</Text>
        {upcoming.length === 0 ? (
          <Text style={styles.empty}>No tienes eventos próximos.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {upcoming.map((event) => {
              const sold = event.ticketTypes.reduce((s, t) => s + t.sold, 0);
              const cap = event.ticketTypes.reduce((s, t) => s + t.quantity, 0);
              return (
                <GlassCard key={event.id} level="card">
                  <Pressable style={{ padding: 14, gap: 8 }} onPress={() => router.push(`/organizador/analiticas/${event.id}`)}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {event.title}
                    </Text>
                    <Text style={styles.kpiHint}>
                      {formatEventDate(event.startsAt)}
                      {event.salesPaused ? " · Ventas pausadas" : ""}
                    </Text>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${cap ? Math.min(1, sold / cap) * 100 : 0}%` }]} />
                    </View>
                    <Text style={styles.kpiHint}>
                      {sold} / {cap} vendidas
                    </Text>
                  </Pressable>
                </GlassCard>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gestionar</Text>
        <GlassCard level="card">
          <MenuRow label="Mis eventos" hint={`${activeEvents} activos · ${myEvents.length} en total`} onPress={() => router.push("/organizador/eventos")} />
          <View style={styles.menuDivider} />
          <MenuRow label="Ventas y pedidos" hint="Filtra, revisa y consulta cada pedido" onPress={() => router.push("/organizador/ventas")} />
          <View style={styles.menuDivider} />
          <MenuRow label="Retiros y finanzas" hint={`${formatUsd(balance.availableCents)} disponibles`} onPress={() => router.push("/organizador/retiros")} />
          <View style={styles.menuDivider} />
          <MenuRow label="Equipo de puerta" hint={staff.length === 0 ? "Nadie todavía" : `${staff.length} ${staff.length === 1 ? "persona" : "personas"}`} onPress={() => router.push("/organizador/equipo")} />
          <View style={styles.menuDivider} />
          <MenuRow label="Mi negocio" hint="Nombre, descripción, logo y cuenta de cobro" onPress={() => router.push("/organizador/negocio")} />
        </GlassCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Últimos pedidos</Text>
        {analyticsOrders.length === 0 ? (
          <Text style={styles.empty}>Todavía no hay pedidos. Cuando alguien compre aparece aquí al instante.</Text>
        ) : (
          <GlassCard level="card">
            {analyticsOrders.slice(0, 6).map((o, i) => (
              <View key={o.id}>
                {i > 0 && <View style={styles.menuDivider} />}
                <View style={styles.orderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderTitle} numberOfLines={1}>
                      {o.quantity} × {stats.names.get(o.event_id) ?? "Evento"}
                    </Text>
                    <Text style={styles.kpiHint}>
                      {formatShortDate(o.created_at)} · {ORDER_LABEL[o.status] ?? o.status}
                    </Text>
                  </View>
                  <Text style={[styles.orderNet, o.status !== "paid" && { color: color.text4 }]}>{o.status === "paid" ? formatUsd(o.organizer_net_cents) : "—"}</Text>
                </View>
              </View>
            ))}
          </GlassCard>
        )}
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
  title: { fontFamily: fontFamily.extraBold, fontSize: 18, color: color.text },
  section: { paddingHorizontal: spacing.screenX, marginBottom: 20 },
  sectionTitle: { fontFamily: fontFamily.extraBold, fontSize: 16, color: color.text, marginBottom: 10 },
  identity: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 48, height: 48, borderRadius: 14 },
  logoFallback: { backgroundColor: "rgba(233,65,127,0.18)", alignItems: "center", justifyContent: "center" },
  logoInitial: { fontFamily: fontFamily.extraBold, fontSize: 20, color: color.pink },
  organizerName: { fontFamily: fontFamily.extraBold, fontSize: 20, color: color.text },
  organizerPlan: { fontFamily: fontFamily.semiBold, fontSize: 12.5, color: color.pink, marginTop: 2 },
  balanceRow: { padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  balanceValue: { fontFamily: fontFamily.extraBold, fontSize: 26, color: color.text, marginVertical: 2 },
  withdrawButton: { paddingHorizontal: 20, height: 42, borderRadius: radius.pill, backgroundColor: color.pink, alignItems: "center", justifyContent: "center" },
  withdrawButtonText: { fontFamily: fontFamily.bold, fontSize: 14, color: color.white },
  alertBox: {
    padding: 14,
    borderRadius: radius.cardLarge,
    backgroundColor: "rgba(233,65,127,0.10)",
    borderWidth: 1,
    borderColor: "rgba(233,65,127,0.30)",
  },
  alertText: { fontFamily: fontFamily.semiBold, fontSize: 12.5, lineHeight: 18, color: color.text2 },
  rangeRow: { flexDirection: "row", gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpiCard: { width: "47.5%" },
  kpiInner: { padding: 14, gap: 4 },
  kpiLabel: { fontFamily: fontFamily.semiBold, fontSize: 11.5, color: color.text3 },
  kpiValue: { fontFamily: fontFamily.extraBold, fontSize: 20, color: color.text },
  kpiChange: { fontFamily: fontFamily.extraBold, fontSize: 11.5, color: color.pink },
  kpiHint: { fontFamily: fontFamily.semiBold, fontSize: 11.5, color: color.text3, flexShrink: 1 },
  empty: { fontFamily: fontFamily.regular, fontSize: 13, color: color.text3, lineHeight: 19 },
  actionsRow: { flexDirection: "row", gap: 10 },
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
  eventTitle: { fontFamily: fontFamily.bold, fontSize: 15, color: color.text },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.10)", overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: color.pink },
  menuRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  menuLabel: { fontFamily: fontFamily.bold, fontSize: 14.5, color: color.text },
  menuHint: { fontFamily: fontFamily.regular, fontSize: 12, color: color.text3, marginTop: 2 },
  menuDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginLeft: 16 },
  orderRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  orderTitle: { fontFamily: fontFamily.bold, fontSize: 13.5, color: color.text },
  orderNet: { fontFamily: fontFamily.extraBold, fontSize: 13.5, color: color.pink },
});
