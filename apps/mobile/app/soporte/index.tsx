import React, { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../../src/components/GlassCard";
import { Chip } from "../../src/components/Chip";
import { PrimaryButton } from "../../src/components/Button";
import { ChevronRight } from "../../src/components/icons";
import { useAppStore } from "../../src/context/AppStore";
import { BUYER_FAQ, ORGANIZER_FAQ, SUPPORT_CATEGORIES } from "../../src/core/support";
import { formatShortDate } from "../../src/utils/format";
import { color, fontFamily, radius, spacing } from "../../src/theme/tokens";
import { InfoTip } from "../../src/components/InfoTip";

const STATUS: Record<string, string> = { abierto: "Abierto", en_proceso: "En proceso", resuelto: "Resuelto", cerrado: "Cerrado" };
const WHATSAPP = process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP ?? "";

export default function SoporteScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { supportTickets, createSupportTicket, organizerStatus } = useAppStore();
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [category, setCategory] = useState("otro");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const faq = organizerStatus === "verified" ? [...ORGANIZER_FAQ, ...BUYER_FAQ] : BUYER_FAQ;
  const canSend = subject.trim().length >= 4 && body.trim().length >= 10;

  async function send() {
    setSending(true);
    setMessage(null);
    const result = await createSupportTicket(category, subject.trim(), body.trim());
    setSending(false);
    if (result.ok && result.ticketId) {
      setWriting(false);
      setSubject("");
      setBody("");
      router.push(`/soporte/${result.ticketId}`);
    } else {
      setMessage(result.reason ?? "No se pudo enviar tu consulta.");
    }
  }

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 80 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ChevronRight color={color.text} />
          </View>
        </Pressable>
        <Text style={styles.title}>Ayuda y soporte</Text>
        <InfoTip label="Ayuda y soporte" size={18} />
      </View>

      <View style={styles.section}>
        <Text style={styles.intro}>Respondemos de 8 a. m. a 12 a. m. Antes de escribir, mira si tu duda ya está aquí.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preguntas frecuentes</Text>
        <GlassCard level="card">
          {faq.map((f, i) => (
            <View key={f.q}>
              {i > 0 && <View style={styles.divider} />}
              <Pressable style={styles.faqRow} onPress={() => setOpenFaq(openFaq === f.q ? null : f.q)}>
                <Text style={styles.faqQ}>{f.q}</Text>
                {openFaq === f.q && <Text style={styles.faqA}>{f.a}</Text>}
              </Pressable>
            </View>
          ))}
        </GlassCard>
      </View>

      <View style={styles.section}>
        {!writing ? (
          <View style={{ gap: 10 }}>
            <PrimaryButton label="Escribirle a Plann" onPress={() => setWriting(true)} />
            {WHATSAPP !== "" && (
              <Pressable style={styles.whatsapp} onPress={() => Linking.openURL(`https://wa.me/${WHATSAPP}`)}>
                <Text style={styles.whatsappText}>Escribir por WhatsApp</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <GlassCard level="card">
            <View style={{ padding: 16, gap: 12 }}>
              <Text style={styles.label}>¿Sobre qué es?</Text>
              <View style={styles.chips}>
                {SUPPORT_CATEGORIES.map((c) => (
                  <Chip key={c.id} label={c.label} selected={category === c.id} onPress={() => setCategory(c.id)} />
                ))}
              </View>
              <TextInput value={subject} onChangeText={setSubject} maxLength={120} placeholder="Asunto" placeholderTextColor={color.text4} style={styles.input} />
              <TextInput
                value={body}
                onChangeText={setBody}
                multiline
                maxLength={2000}
                placeholder="Cuéntanos qué pasó, con el detalle que puedas (evento, monto, fecha)"
                placeholderTextColor={color.text4}
                style={[styles.input, styles.textArea]}
              />
              {message && <Text style={styles.error}>{message}</Text>}
              <PrimaryButton label="Enviar consulta" disabled={!canSend} loading={sending} onPress={send} />
              <Pressable onPress={() => setWriting(false)} style={{ alignSelf: "center" }}>
                <Text style={styles.hint}>Cancelar</Text>
              </Pressable>
            </View>
          </GlassCard>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tus consultas</Text>
        {supportTickets.length === 0 ? (
          <Text style={styles.hint}>Todavía no has escrito a soporte.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {supportTickets.map((t) => (
              <GlassCard key={t.id} level="card">
                <Pressable style={styles.ticket} onPress={() => router.push(`/soporte/${t.id}`)}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.ticketSubject} numberOfLines={1}>
                      {t.subject}
                    </Text>
                    <Text style={styles.hint}>
                      {STATUS[t.status]} · {formatShortDate(t.lastMessageAt)}
                    </Text>
                  </View>
                  <ChevronRight color={color.text3} />
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
  section: { paddingHorizontal: spacing.screenX, marginBottom: 22 },
  intro: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 20, color: color.text2 },
  sectionTitle: { fontFamily: fontFamily.extraBold, fontSize: 16, color: color.text, marginBottom: 10 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginLeft: 16 },
  faqRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  faqQ: { fontFamily: fontFamily.bold, fontSize: 14, color: color.text },
  faqA: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19, color: color.text3 },
  whatsapp: { minHeight: 48, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  whatsappText: { fontFamily: fontFamily.bold, fontSize: 14, color: color.text },
  label: { fontFamily: fontFamily.bold, fontSize: 13, color: color.text2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: { height: 48, borderRadius: radius.field, paddingHorizontal: 16, backgroundColor: "rgba(255,255,255,0.09)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", fontFamily: fontFamily.regular, fontSize: 14, color: color.text },
  textArea: { height: 110, paddingTop: 14, textAlignVertical: "top" },
  error: { fontFamily: fontFamily.semiBold, fontSize: 13, color: color.pink },
  hint: { fontFamily: fontFamily.regular, fontSize: 12.5, color: color.text3 },
  ticket: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  ticketSubject: { fontFamily: fontFamily.bold, fontSize: 14.5, color: color.text },
});
