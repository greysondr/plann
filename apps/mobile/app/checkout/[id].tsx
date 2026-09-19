import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { GlassCard } from "../../src/components/GlassCard";
import { PrimaryButton } from "../../src/components/Button";
import { CopyIcon } from "../../src/components/icons";
import { TicketCard } from "../../src/components/TicketCard";
import { useAppStore, useEvent } from "../../src/context/AppStore";
import { supabase } from "../../src/lib/supabase";
import { calculateOrderTotals, formatBs, formatUsd } from "../../src/core/pricing";
import type { PaymentMethod } from "../../src/core/types";
import { color, fontFamily, radius, spacing } from "../../src/theme/tokens";

const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
  { key: "pago_movil", label: "Pago móvil" },
  { key: "transfer", label: "Transferencia" },
  { key: "zelle", label: "Zelle" },
];

interface ReceivingAccount {
  id: string;
  type: PaymentMethod;
  label: string;
  details: Record<string, string>;
}

function useCountdown(expiresAt?: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!expiresAt) return { label: "15:00", expired: false };
  const diff = Math.max(0, new Date(expiresAt).getTime() - now);
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { label: `${minutes}:${seconds.toString().padStart(2, "0")}`, expired: diff <= 0 };
}

export default function CheckoutScreen() {
  const params = useLocalSearchParams<{ id: string; ticketTypeId?: string; quantity?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const event = useEvent(params.id);
  const { orders, tickets, rateApplied, createOrder, previewCoupon, submitPaymentReference, quoteAutoOffer } = useAppStore();
  const [auto, setAuto] = useState<{ discountCents: number; label?: string }>({ discountCents: 0 });

  const [orderId, setOrderId] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [uiStep, setUiStep] = useState<"resumen" | "metodo">("resumen");
  const [reference, setReference] = useState("");
  const [bank, setBank] = useState("");
  const [busy, setBusy] = useState(false);
  const [accounts, setAccounts] = useState<ReceivingAccount[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discountCents: number } | null>(null);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const quantity = Number(params.quantity ?? 1);
  const ticketType = event?.ticketTypes.find((t) => t.id === params.ticketTypeId);
  const order = orders.find((o) => o.id === orderId);
  const countdown = useCountdown(order?.expiresAt);

  useEffect(() => {
    supabase
      .from("receiving_accounts")
      .select("id, type, label, details")
      .eq("is_active", true)
      .eq("show_in_app", true)
      .then(({ data }) => setAccounts((data as ReceivingAccount[]) ?? []));
  }, []);

  useEffect(() => {
    if (ticketType && ticketType.priceCents > 0) quoteAutoOffer(ticketType.id, quantity).then(setAuto);
  }, [ticketType?.id, ticketType?.priceCents, quantity, quoteAutoOffer]);
  // Igual que en el servidor: rige el mejor descuento, no se suman.
  const autoWins = auto.discountCents > (coupon?.discountCents ?? 0);
  const appliedDiscount = Math.max(auto.discountCents, coupon?.discountCents ?? 0);

  const totals = useMemo(() => {
    if (!ticketType) return null;
    return calculateOrderTotals({
      unitPriceCents: ticketType.priceCents,
      quantity,
      commissionRate: 0, // no afecta el total del comprador, solo el reparto del organizador
      rateUsed: rateApplied,
      discountCents: appliedDiscount,
    });
  }, [ticketType, quantity, rateApplied, appliedDiscount]);
  const isFree = !!totals && totals.totalCents === 0;

  const myTickets = order ? tickets.filter((t) => t.orderId === order.id) : [];

  if (!event || !ticketType || !totals) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
        <Text style={{ color: color.text, fontFamily: fontFamily.bold }}>No encontramos esta orden.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: color.pink, fontFamily: fontFamily.bold }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  async function handleChooseMethod(method: PaymentMethod) {
    setBusy(true);
    const result = await createOrder(ticketType!.id, quantity, coupon?.code);
    setBusy(false);
    if (!result.ok || !result.order) {
      Alert.alert("No se pudo reservar", result.reason ?? "Intenta de nuevo.");
      router.back();
      return;
    }
    setSelectedMethod(method);
    setOrderId(result.order.id);
  }

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code || !ticketType) return;
    setCheckingCoupon(true);
    setCouponMessage(null);
    const result = await previewCoupon(ticketType.id, quantity, code);
    setCheckingCoupon(false);
    if (result.valid) {
      setCoupon({ code, discountCents: result.discountCents });
      setCouponMessage(null);
    } else {
      setCoupon(null);
      setCouponMessage(result.reason ?? "Ese cupón no es válido.");
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponInput("");
    setCouponMessage(null);
  }

  async function copy(value: string) {
    await Clipboard.setStringAsync(value);
  }

  async function handleSubmitReference() {
    if (!order || !selectedMethod) return;
    if (!reference.trim()) {
      Alert.alert("Falta la referencia", "Escribe los últimos dígitos del pago para poder verificarlo.");
      return;
    }
    setBusy(true);
    const result = await submitPaymentReference(order.id, selectedMethod, reference.trim(), bank.trim() || undefined);
    setBusy(false);
    if (!result.ok) {
      Alert.alert("No se pudo enviar", result.reason ?? "Intenta de nuevo.");
    }
  }

  // Evento gratuito o sin orden creada todavía: resumen + elegir método.
  if (!order) {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.screenX, paddingTop: insets.top + 20, paddingBottom: 140 }}>
          <Text style={styles.stepTitle}>{uiStep === "resumen" ? "Resumen" : "Método de pago"}</Text>

          {uiStep === "resumen" && (
            <>
              <GlassCard level="card" style={styles.summaryCard}>
                <View style={{ padding: 15, gap: 10 }}>
                  <Text style={styles.eventTitle} numberOfLines={2}>
                    {event.title}
                  </Text>
                  <Row label={`${ticketType.name} x${quantity}`} value={formatUsd(ticketType.priceCents * quantity)} />
                  {autoWins ? (
                    <Row label={auto.label ?? "Oferta"} value={`−${formatUsd(auto.discountCents)}`} />
                  ) : (
                    coupon && <Row label={`Cupón ${coupon.code.toUpperCase()}`} value={`−${formatUsd(coupon.discountCents)}`} />
                  )}
                  {totals.serviceFeeCents > 0 && <Row label="Fee de servicio" value={formatUsd(totals.serviceFeeCents)} />}
                  <View style={styles.divider} />
                  <Row label="Total" value={isFree ? "Gratis" : formatUsd(totals.totalCents)} bold />
                  {!isFree && <Text style={styles.bsHint}>≈ {formatBs(totals.totalBs)} · tasa Plann de hoy</Text>}
                </View>
              </GlassCard>

              {ticketType.priceCents > 0 && (
                <View style={{ marginTop: 16 }}>
                  {coupon ? (
                    <View style={styles.couponApplied}>
                      <Text style={styles.couponAppliedText}>Cupón aplicado: {coupon.code.toUpperCase()}</Text>
                      <Pressable onPress={removeCoupon} hitSlop={8}>
                        <Text style={styles.couponRemove}>Quitar</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.couponRow}>
                      <TextInput
                        value={couponInput}
                        onChangeText={(v) => {
                          setCouponInput(v);
                          setCouponMessage(null);
                        }}
                        placeholder="¿Tienes un cupón?"
                        placeholderTextColor={color.text4}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        style={[styles.input, { flex: 1 }]}
                      />
                      <Pressable style={[styles.couponButton, !couponInput.trim() && { opacity: 0.4 }]} disabled={!couponInput.trim() || checkingCoupon} onPress={applyCoupon}>
                        <Text style={styles.couponButtonText}>{checkingCoupon ? "..." : "Aplicar"}</Text>
                      </Pressable>
                    </View>
                  )}
                  {couponMessage && <Text style={styles.couponError}>{couponMessage}</Text>}
                </View>
              )}
              <PrimaryButton
                label={isFree ? "Confirmar" : "Continuar"}
                loading={busy}
                style={{ marginTop: 20 }}
                onPress={() => {
                  if (isFree) {
                    handleChooseMethod("pago_movil");
                  } else {
                    setUiStep("metodo");
                  }
                }}
              />
            </>
          )}

          {uiStep === "metodo" && (
            <View style={{ gap: 12 }}>
              {PAYMENT_METHODS.map((m) => (
                <Pressable key={m.key} style={styles.methodRow} onPress={() => handleChooseMethod(m.key)} disabled={busy}>
                  <Text style={styles.methodLabel}>{m.label}</Text>
                  <Text style={styles.methodTotal}>{formatUsd(totals.totalCents)}</Text>
                </Pressable>
              ))}
              {busy && <ActivityIndicator color={color.pink} />}
              <Text style={styles.methodHint}>
                Tickets bloqueados por 15 minutos apenas eliges el método. Verificamos entre 8 a. m. y 12 a. m., normalmente en menos de 15 minutos.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // Orden gratuita o ya aprobada.
  if (order.status === "paid") {
    return (
      <ScrollView contentContainerStyle={{ padding: spacing.screenX, paddingTop: insets.top + 30, paddingBottom: 60, alignItems: "center" }}>
        <Text style={styles.successTitle}>Listo, aquí está tu ticket</Text>
        <Text style={styles.successSubtitle}>Lo guardamos también en Mis tickets, funciona sin internet.</Text>
        <View style={{ width: "100%", marginTop: 20, gap: 16 }}>
          {myTickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} event={event} ticketTypeName={ticketType.name} />
          ))}
        </View>
        <PrimaryButton label="Ver mis tickets" style={{ marginTop: 24, width: "100%" }} onPress={() => router.replace("/tickets")} />
      </ScrollView>
    );
  }

  if (order.status === "in_verification") {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={color.pink} />
        <Text style={styles.verifyingTitle}>Verificando tu pago</Text>
        <Text style={styles.verifyingSubtitle}>Referencia {order.reference}. Esto no debería tardar más de 15 minutos.</Text>
      </View>
    );
  }

  if (order.status === "expired") {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.verifyingTitle}>Tu reserva expiró</Text>
        <Text style={styles.verifyingSubtitle}>Liberamos los puestos. Puedes volver a intentarlo cuando quieras.</Text>
        <PrimaryButton label="Volver al evento" style={{ marginTop: 20 }} onPress={() => router.back()} />
      </View>
    );
  }

  // pending_payment: instrucciones de pago + formulario de referencia.
  const account = accounts.find((a) => a.type === selectedMethod);
  const fields = account ? Object.entries(account.details) : [];
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.screenX, paddingTop: insets.top + 20, paddingBottom: 60 }}>
      <View style={styles.countdownRow}>
        <Text style={styles.stepTitle}>Completa tu pago</Text>
        <Text style={[styles.countdown, countdown.expired && { color: color.pink }]}>{countdown.label}</Text>
      </View>

      <GlassCard level="card" style={styles.summaryCard}>
        <View style={{ padding: 15, gap: 4 }}>
          <Text style={styles.amountLabel}>Monto exacto a pagar</Text>
          <Text style={styles.amountBs}>{formatBs(order.totalBs)}</Text>
          <Text style={styles.amountUsd}>{formatUsd(order.totalCents)} · tasa Plann Bs {order.rateUsed.toFixed(2)}</Text>
        </View>
      </GlassCard>

      <Text style={styles.sectionTitle}>Datos para pagar</Text>
      <GlassCard level="card" style={{ marginBottom: 20 }}>
        {account && (
          <View style={[styles.fieldRow, { paddingBottom: 0 }]}>
            <Text style={styles.fieldValue}>{account.label}</Text>
          </View>
        )}
        {fields.map(([label, value], idx) => (
          <View key={label}>
            <View style={styles.fieldRow}>
              <View>
                <Text style={styles.fieldLabel}>{label}</Text>
                <Text style={styles.fieldValue}>{value}</Text>
              </View>
              <Pressable onPress={() => copy(value)} style={styles.copyBtn}>
                <CopyIcon />
                <Text style={styles.copyText}>Copiar</Text>
              </Pressable>
            </View>
            {idx < fields.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </GlassCard>

      <Text style={styles.sectionTitle}>Referencia del pago</Text>
      <View style={{ gap: 10, marginBottom: 20 }}>
        <TextInput
          value={reference}
          onChangeText={setReference}
          placeholder="Últimos 6-8 dígitos de la referencia"
          placeholderTextColor={color.text4}
          style={styles.input}
          keyboardType="number-pad"
        />
        <TextInput
          value={bank}
          onChangeText={setBank}
          placeholder="Banco emisor (opcional)"
          placeholderTextColor={color.text4}
          style={styles.input}
        />
      </View>

      <PrimaryButton label="Ya pagué, envié la referencia" loading={busy} onPress={handleSubmitReference} />
    </ScrollView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={bold ? styles.rowLabelBold : styles.rowLabel}>{label}</Text>
      <Text style={bold ? styles.rowValueBold : styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stepTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 22,
    letterSpacing: -0.4,
    color: color.text,
    marginBottom: 16,
  },
  summaryCard: {
    marginBottom: 8,
  },
  eventTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: color.text,
  },
  rowLabel: { fontFamily: fontFamily.regular, fontSize: 13.5, color: color.text3 },
  rowValue: { fontFamily: fontFamily.semiBold, fontSize: 13.5, color: color.text2 },
  rowLabelBold: { fontFamily: fontFamily.extraBold, fontSize: 15, color: color.text },
  rowValueBold: { fontFamily: fontFamily.extraBold, fontSize: 15, color: color.text },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  bsHint: { fontFamily: fontFamily.medium, fontSize: 12, color: color.text3 },
  methodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: radius.field,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  methodLabel: { fontFamily: fontFamily.bold, fontSize: 15, color: color.text },
  methodTotal: { fontFamily: fontFamily.extraBold, fontSize: 15, color: color.pink },
  methodHint: { fontFamily: fontFamily.regular, fontSize: 12.5, color: color.text3, marginTop: 6, lineHeight: 18 },
  countdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  countdown: {
    fontFamily: fontFamily.extraBold,
    fontSize: 15,
    color: color.text2,
    marginBottom: 16,
  },
  amountLabel: { fontFamily: fontFamily.semiBold, fontSize: 12, color: color.text3 },
  amountBs: { fontFamily: fontFamily.extraBold, fontSize: 26, color: color.text },
  amountUsd: { fontFamily: fontFamily.medium, fontSize: 12.5, color: color.text3 },
  sectionTitle: { fontFamily: fontFamily.extraBold, fontSize: 15, color: color.text, marginBottom: 10 },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  fieldLabel: { fontFamily: fontFamily.semiBold, fontSize: 11, color: color.text4, textTransform: "uppercase", letterSpacing: 0.4 },
  fieldValue: { fontFamily: fontFamily.bold, fontSize: 15, color: color.text, marginTop: 2 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 8 },
  copyText: { fontFamily: fontFamily.bold, fontSize: 12.5, color: color.text2 },
  couponRow: { flexDirection: "row", gap: 10 },
  couponButton: { paddingHorizontal: 18, height: 50, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  couponButtonText: { fontFamily: fontFamily.bold, fontSize: 14, color: color.text },
  couponApplied: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: radius.cardLarge, backgroundColor: "rgba(233,65,127,0.10)", borderWidth: 1, borderColor: "rgba(233,65,127,0.30)" },
  couponAppliedText: { fontFamily: fontFamily.bold, fontSize: 13.5, color: color.text },
  couponRemove: { fontFamily: fontFamily.bold, fontSize: 13, color: color.pink },
  couponError: { fontFamily: fontFamily.semiBold, fontSize: 12.5, color: color.pink, marginTop: 8 },
  input: {
    height: 50,
    borderRadius: radius.field,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: color.text,
  },
  centerScreen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 8 },
  verifyingTitle: { fontFamily: fontFamily.extraBold, fontSize: 18, color: color.text, marginTop: 16, textAlign: "center" },
  verifyingSubtitle: { fontFamily: fontFamily.regular, fontSize: 13.5, color: color.text3, textAlign: "center" },
  successTitle: { fontFamily: fontFamily.extraBold, fontSize: 24, color: color.text, textAlign: "center", letterSpacing: -0.4 },
  successSubtitle: { fontFamily: fontFamily.regular, fontSize: 13.5, color: color.text3, textAlign: "center", marginTop: 6 },
});
