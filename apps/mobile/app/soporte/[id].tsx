import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../../src/components/GlassCard";
import { PrimaryButton } from "../../src/components/Button";
import { ChevronRight } from "../../src/components/icons";
import { useAppStore, type SupportMessage } from "../../src/context/AppStore";
import { timeAgo } from "../../src/utils/format";
import { supabase } from "../../src/lib/supabase";
import { color, fontFamily, radius, spacing } from "../../src/theme/tokens";
import { InfoTip } from "../../src/components/InfoTip";

const STATUS: Record<string, string> = { abierto: "Abierto", en_proceso: "En proceso", resuelto: "Resuelto", cerrado: "Cerrado" };

export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { supportTickets, fetchSupportMessages, replySupport } = useAppStore();
  const ticket = supportTickets.find((t) => t.id === id);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (id) setMessages(await fetchSupportMessages(id));
  }, [id, fetchSupportMessages]);

  useEffect(() => {
    load();
    if (!id) return;
    const channel = supabase
      .channel(`plann-ticket-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${id}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, load]);

  async function send() {
    if (!id) return;
    setSending(true);
    setError(null);
    const result = await replySupport(id, text.trim());
    setSending(false);
    if (result.ok) {
      setText("");
      load();
    } else setError(result.reason ?? "No se pudo enviar.");
  }

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ChevronRight color={color.text} />
          </View>
        </Pressable>
        <Text style={styles.title}>Consulta</Text>
        <InfoTip label="Consulta" size={18} />
      </View>

      <View style={styles.section}>
        <Text style={styles.subject}>{ticket?.subject ?? "Consulta"}</Text>
        {ticket && <Text style={styles.status}>{STATUS[ticket.status]}{ticket.priority === "alta" ? " · Prioritaria" : ""}</Text>}
      </View>

      <View style={[styles.section, { gap: 10 }]}>
        {messages.map((m) => (
          <GlassCard key={m.id} level="card" style={m.fromStaff ? styles.staffCard : undefined}>
            <View style={{ padding: 14, gap: 4 }}>
              <Text style={styles.meta}>
                {m.fromStaff ? "Plann" : "Tú"} · {timeAgo(m.createdAt)}
              </Text>
              <Text style={styles.body}>{m.body}</Text>
            </View>
          </GlassCard>
        ))}
      </View>

      {ticket?.status !== "cerrado" && (
        <View style={styles.section}>
          <TextInput value={text} onChangeText={setText} multiline maxLength={2000} placeholder="Escribe tu respuesta" placeholderTextColor={color.text4} style={styles.input} />
          {error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton label="Responder" disabled={text.trim().length < 1} loading={sending} onPress={send} style={{ marginTop: 10 }} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.screenX, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  title: { fontFamily: fontFamily.extraBold, fontSize: 18, color: color.text },
  section: { paddingHorizontal: spacing.screenX, marginBottom: 18 },
  subject: { fontFamily: fontFamily.extraBold, fontSize: 20, color: color.text },
  status: { fontFamily: fontFamily.bold, fontSize: 12.5, color: color.pink, marginTop: 4 },
  staffCard: { borderColor: "rgba(233,65,127,0.4)" },
  meta: { fontFamily: fontFamily.semiBold, fontSize: 11.5, color: color.text3 },
  body: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, color: color.text2 },
  input: { minHeight: 90, borderRadius: radius.field, paddingHorizontal: 16, paddingTop: 14, backgroundColor: "rgba(255,255,255,0.09)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", fontFamily: fontFamily.regular, fontSize: 14, color: color.text, textAlignVertical: "top" },
  error: { fontFamily: fontFamily.semiBold, fontSize: 13, color: color.pink, marginTop: 8 },
});
