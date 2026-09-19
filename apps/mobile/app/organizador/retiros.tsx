import React, { useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../../src/components/GlassCard";
import { Chip } from "../../src/components/Chip";
import { PrimaryButton } from "../../src/components/Button";
import { ChevronRight } from "../../src/components/icons";
import { useAppStore } from "../../src/context/AppStore";
import { useOrganizerGuard } from "../../src/hooks/useOrganizerGuard";
import { formatUsd } from "../../src/core/pricing";
import { formatShortDate } from "../../src/utils/format";
import type { PaymentMethod } from "../../src/core/types";
import { color, fontFamily, radius, spacing } from "../../src/theme/tokens";

const MIN_WITHDRAWAL_CENTS = 500;

const METHOD_LABEL: Record<PaymentMethod, string> = {
  pago_movil: "Pago Móvil",
  transfer: "Transferencia",
  zelle: "Zelle",
};

const ACCOUNT_PLACEHOLDER: Record<PaymentMethod, string> = {
  pago_movil: "Banco, teléfono y cédula",
  transfer: "Banco, número de cuenta y titular",
  zelle: "Correo o teléfono de tu cuenta Zelle",
};

const STATUS_LABEL = { pendiente: "En proceso", pagado: "Pagado", rechazado: "Rechazado" } as const;

export default function RetirosScreen() {
  const allowed = useOrganizerGuard();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { balance, withdrawals, organizerProfile, requestWithdrawal } = useAppStore();
  const RELEASE: Record<string, string> = {
    basico: "3 días después de que termina cada evento",
    pro: "3 días después de cada venta",
    business: "24 horas después de cada venta",
  };

  const [method, setMethod] = useState<PaymentMethod>(organizerProfile?.payoutMethod ?? "pago_movil");
  const [account, setAccount] = useState(organizerProfile?.payoutAccount ?? "");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  if (!allowed) return null;

  const amountCents = Math.round(parseFloat(amount.replace(",", ".")) * 100);
  const validAmount = Number.isFinite(amountCents) && amountCents >= MIN_WITHDRAWAL_CENTS && amountCents <= balance.availableCents;
  const canSubmit = validAmount && account.trim().length >= 6 && !sending;

  async function shareReceipt(w: (typeof withdrawals)[number]) {
    const lines = [
      "Comprobante de retiro - Plann",
      `Estado: ${STATUS_LABEL[w.status]}`,
      `Monto: ${formatUsd(w.amountCents)}`,
      `Organizador: ${organizerProfile?.name ?? ""}`,
      organizerProfile?.document ? `Cédula o RIF: ${organizerProfile.document}` : "",
      `Método: ${METHOD_LABEL[w.method]}`,
      `Cuenta de destino: ${w.account}`,
      `Solicitado: ${new Date(w.requestedAt).toLocaleString("es-VE")}`,
      `Referencia: ${w.id.slice(0, 8).toUpperCase()}`,
    ].filter(Boolean);
    await Share.share({ title: "Comprobante de retiro", message: lines.join("\n") });
  }

  async function handleSubmit() {
    setSending(true);
    setMessage(null);
    const result = await requestWithdrawal(amountCents, method, account.trim());
    setSending(false);
    if (result.ok) {
      setAmount("");
      setMessage({ text: "Recibimos tu solicitud. Te pagamos en 1 a 2 días hábiles.", error: false });
    } else {
      setMessage({ text: result.reason ?? "No se pudo solicitar el retiro.", error: true });
    }
  }

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ChevronRight color={color.text} />
          </View>
        </Pressable>
        <Text style={styles.title}>Retiros</Text>
        <View style={{ width: 18 }} />
      </View>

      <View style={styles.section}>
        <GlassCard level="card">
          <View style={{ padding: 18, gap: 4 }}>
            <Text style={styles.balanceLabel}>Disponible para retirar</Text>
            <Text style={styles.balanceValue}>{formatUsd(balance.availableCents)}</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownText}>En proceso {formatUsd(balance.pendingCents)}</Text>
              <Text style={styles.breakdownText}>Ya retirado {formatUsd(balance.withdrawnCents)}</Text>
            </View>
            {balance.releasePendingCents > 0 && (
              <Text style={styles.releaseText}>
                Por liberar {formatUsd(balance.releasePendingCents)} · Se libera {RELEASE[organizerProfile?.plan ?? "basico"]}.
              </Text>
            )}
            {balance.refundPendingCents > 0 && <Text style={styles.releaseText}>Por reembolsar {formatUsd(balance.refundPendingCents)} (ya descontado de tu saldo).</Text>}
          </View>
        </GlassCard>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Solicitar retiro</Text>
        <Text style={styles.label}>Recibir por</Text>
        <View style={styles.chipsWrap}>
          {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => (
            <Chip key={m} label={METHOD_LABEL[m]} selected={method === m} onPress={() => setMethod(m)} />
          ))}
        </View>

        <Text style={styles.label}>Datos de la cuenta</Text>
        <TextInput
          value={account}
          onChangeText={setAccount}
          placeholder={ACCOUNT_PLACEHOLDER[method]}
          placeholderTextColor={color.text4}
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>Monto en USD</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder={`Mínimo ${formatUsd(MIN_WITHDRAWAL_CENTS)}`}
          placeholderTextColor={color.text4}
          keyboardType="decimal-pad"
          style={styles.input}
        />
        <Pressable
          disabled={balance.availableCents < MIN_WITHDRAWAL_CENTS}
          onPress={() => setAmount((balance.availableCents / 100).toFixed(2))}
        >
          <Text style={[styles.link, balance.availableCents < MIN_WITHDRAWAL_CENTS && { opacity: 0.4 }]}>Retirar todo</Text>
        </Pressable>

        {balance.availableCents < MIN_WITHDRAWAL_CENTS && (
          <Text style={styles.hint}>Puedes retirar cuando tengas al menos {formatUsd(MIN_WITHDRAWAL_CENTS)} disponibles.</Text>
        )}
        {message && <Text style={[styles.message, message.error && styles.messageError]}>{message.text}</Text>}

        <PrimaryButton label="Solicitar retiro" disabled={!canSubmit} loading={sending} onPress={handleSubmit} style={{ marginTop: 14 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Historial</Text>
        {withdrawals.length === 0 ? (
          <Text style={styles.hint}>Todavía no has pedido ningún retiro.</Text>
        ) : (
          <View style={{ gap: 10, marginTop: 6 }}>
            {withdrawals.map((w) => (
              <GlassCard key={w.id} level="card">
                <View style={styles.historyRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyAmount}>{formatUsd(w.amountCents)}</Text>
                    <Text style={styles.historyMeta}>
                      {METHOD_LABEL[w.method]} · {formatShortDate(w.requestedAt)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={[styles.historyStatus, w.status === "pagado" && { color: color.pink }]}>{STATUS_LABEL[w.status]}</Text>
                    <Pressable onPress={() => shareReceipt(w)} hitSlop={8}>
                      <Text style={styles.receiptLink}>Comprobante</Text>
                    </Pressable>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>
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
  section: { paddingHorizontal: spacing.screenX, marginBottom: 24 },
  sectionTitle: { fontFamily: fontFamily.extraBold, fontSize: 16, color: color.text, marginBottom: 6 },
  balanceLabel: { fontFamily: fontFamily.semiBold, fontSize: 12.5, color: color.text3 },
  balanceValue: { fontFamily: fontFamily.extraBold, fontSize: 30, color: color.text },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  releaseText: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17, color: color.text3, marginTop: 8 },
  receiptLink: { fontFamily: fontFamily.bold, fontSize: 12, color: color.pink },
  breakdownText: { fontFamily: fontFamily.semiBold, fontSize: 12, color: color.text3 },
  label: { fontFamily: fontFamily.bold, fontSize: 13, color: color.text2, marginTop: 14, marginBottom: 8 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
  link: { fontFamily: fontFamily.bold, fontSize: 13, color: color.pink, marginTop: 10 },
  hint: { fontFamily: fontFamily.regular, fontSize: 12.5, color: color.text3, marginTop: 8, lineHeight: 18 },
  message: { fontFamily: fontFamily.semiBold, fontSize: 13, color: color.text2, marginTop: 12 },
  messageError: { color: color.pink },
  historyRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  historyAmount: { fontFamily: fontFamily.extraBold, fontSize: 16, color: color.text },
  historyMeta: { fontFamily: fontFamily.semiBold, fontSize: 12, color: color.text3, marginTop: 2 },
  historyStatus: { fontFamily: fontFamily.bold, fontSize: 12.5, color: color.text3 },
});
