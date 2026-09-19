import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../../src/components/GlassCard";
import { Chip } from "../../src/components/Chip";
import { PrimaryButton } from "../../src/components/Button";
import { ChevronRight } from "../../src/components/icons";
import { useAppStore } from "../../src/context/AppStore";
import { useOrganizerGuard } from "../../src/hooks/useOrganizerGuard";
import { dayKey, eventSettlements, isPaid } from "../../src/core/orgAnalytics";
import { formatUsd } from "../../src/core/pricing";
import { color, fontFamily, spacing } from "../../src/theme/tokens";
import { HelpTitle, InfoTip } from "../../src/components/InfoTip";

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const csv = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

export default function ReportesScreen() {
  const allowed = useOrganizerGuard();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { events, myOrganizerId, analyticsOrders, organizerProfile } = useAppStore();
  const [chosen, setChosen] = useState<string | null>(null);

  const months = useMemo(() => [...new Set(analyticsOrders.filter(isPaid).map((o) => dayKey(o.paid_at ?? o.created_at).slice(0, 7)))].sort().reverse(), [analyticsOrders]);
  const month = chosen && months.includes(chosen) ? chosen : months[0];

  const data = useMemo(() => {
    if (!month) return null;
    const rows = analyticsOrders.filter((o) => dayKey(o.paid_at ?? o.created_at).slice(0, 7) === month && (isPaid(o) || o.status === "refund_pending" || o.status === "refunded"));
    const settle = [...eventSettlements(rows).values()];
    const title = new Map(events.filter((e) => e.organizerId === myOrganizerId).map((e) => [e.id, e.title]));
    const typeName = new Map(events.flatMap((e) => e.ticketTypes.map((t) => [t.id, t.name] as const)));
    const totals = settle.reduce(
      (t, s) => ({ tickets: t.tickets + s.tickets, gross: t.gross + s.grossCents, disc: t.disc + s.discountCents, comm: t.comm + s.commissionCents, net: t.net + s.netCents }),
      { tickets: 0, gross: 0, disc: 0, comm: 0, net: 0 }
    );
    return { rows, settle, title, typeName, totals };
  }, [month, analyticsOrders, events, myOrganizerId]);

  if (!allowed) return null;

  const label = month ? `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}` : "";

  async function share() {
    if (!data || !month) return;
    const header = ["Fecha", "Evento", "Entrada", "Cantidad", "Precio de lista USD", "Cupón USD", "Comisión Plann USD", "Neto USD", "Estado"];
    const lines = data.rows.map((o) =>
      [
        new Date(o.paid_at ?? o.created_at).toLocaleString("es-VE"),
        data.title.get(o.event_id) ?? "",
        data.typeName.get(o.ticket_type_id) ?? "",
        o.quantity,
        ((o.subtotal_cents + (o.discount_cents ?? 0)) / 100).toFixed(2),
        ((o.discount_cents ?? 0) / 100).toFixed(2),
        (o.commission_cents / 100).toFixed(2),
        (o.organizer_net_cents / 100).toFixed(2),
        o.status === "paid" ? "Pagada" : o.status === "refund_pending" ? "Por reembolsar" : "Reembolsada",
      ]
        .map(csv)
        .join(",")
    );
    await Share.share({ title: `Ventas ${label} - ${organizerProfile?.name ?? "Plann"}`, message: [header.join(","), ...lines].join("\n") });
  }

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 60 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ChevronRight color={color.text} />
          </View>
        </Pressable>
        <Text style={styles.title}>Reportes</Text>
        <InfoTip label="Reportes" size={18} />
      </View>

      {!month || !data ? (
        <View style={styles.section}>
          <Text style={styles.meta}>Aún no hay ventas para reportar.</Text>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {months.map((m) => (
              <Chip key={m} label={`${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`} selected={m === month} onPress={() => setChosen(m)} />
            ))}
          </ScrollView>

          <View style={styles.section}>
            <GlassCard level="card">
              <View style={{ padding: 16, gap: 10 }}>
                <Text style={styles.monthLabel}>{label}</Text>
                <Row label="Entradas" value={String(data.totals.tickets)} />
                <Row label="Bruto" value={formatUsd(data.totals.gross)} />
                <Row label="Cupones" value={data.totals.disc ? `−${formatUsd(data.totals.disc)}` : "—"} />
                <Row label="Comisión de Plann" value={`−${formatUsd(data.totals.comm)}`} />
                <View style={styles.divider} />
                <Row label="Neto para ti" value={formatUsd(data.totals.net)} strong />
              </View>
            </GlassCard>
          </View>

          <View style={styles.section}>
            <HelpTitle style={styles.sectionTitle}>Por evento</HelpTitle>
            <View style={{ gap: 10 }}>
              {data.settle.map((s) => (
                <GlassCard key={s.eventId} level="card">
                  <View style={{ padding: 14, gap: 6 }}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {data.title.get(s.eventId)}
                    </Text>
                    <Text style={styles.meta}>
                      {s.tickets} entradas · comisión {formatUsd(s.commissionCents)}
                      {s.refundedCents ? ` · reembolsos ${formatUsd(s.refundedCents)}` : ""}
                    </Text>
                    <Text style={styles.net}>{formatUsd(s.netCents)}</Text>
                  </View>
                </GlassCard>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <PrimaryButton label="Compartir reporte (CSV)" onPress={share} />
            <Text style={[styles.meta, { marginTop: 10 }]}>Se abre el menú para enviarlo por correo o WhatsApp, o abrirlo en Excel.</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={strong ? styles.strong : styles.meta}>{label}</Text>
      <Text style={strong ? [styles.strong, { color: color.pink }] : styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.screenX, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  title: { fontFamily: fontFamily.extraBold, fontSize: 18, color: color.text },
  chips: { paddingHorizontal: spacing.screenX, gap: 8, marginBottom: 14 },
  section: { paddingHorizontal: spacing.screenX, marginBottom: 20 },
  sectionTitle: { fontFamily: fontFamily.extraBold, fontSize: 16, color: color.text, marginBottom: 10 },
  monthLabel: { fontFamily: fontFamily.extraBold, fontSize: 18, color: color.text, textTransform: "capitalize" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  meta: { fontFamily: fontFamily.semiBold, fontSize: 12.5, color: color.text3 },
  value: { fontFamily: fontFamily.bold, fontSize: 14, color: color.text },
  strong: { fontFamily: fontFamily.extraBold, fontSize: 15, color: color.text },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  eventTitle: { fontFamily: fontFamily.bold, fontSize: 14.5, color: color.text },
  net: { fontFamily: fontFamily.extraBold, fontSize: 16, color: color.pink },
});
