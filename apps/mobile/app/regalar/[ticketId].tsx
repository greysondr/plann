import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "../../src/components/Button";
import { ChevronRight } from "../../src/components/icons";
import { useAppStore } from "../../src/context/AppStore";
import { formatEventDate } from "../../src/utils/format";
import { color, fontFamily, radius, spacing } from "../../src/theme/tokens";
import { InfoTip } from "../../src/components/InfoTip";

export default function RegalarScreen() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tickets, events, giftTicket } = useAppStore();
  const ticket = tickets.find((t) => t.id === ticketId);
  const event = events.find((e) => e.id === ticket?.eventId);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());

  function confirm() {
    Alert.alert("Regalar entrada", `Se la enviaremos a ${email.trim()}. Tu QR actual dejará de funcionar y solo servirá el de esa persona.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Regalar", onPress: send },
    ]);
  }

  async function send() {
    if (!ticket) return;
    setSending(true);
    setError(null);
    const result = await giftTicket(ticket.id, email.trim(), message);
    setSending(false);
    if (!result.ok) {
      setError(result.reason ?? "No se pudo regalar la entrada.");
      return;
    }
    Alert.alert(
      result.delivered ? "Entrada enviada" : "Regalo guardado",
      result.delivered
        ? "Ya está en los tickets de esa persona."
        : "Todavía no tiene cuenta en Plann. Cuando se registre con ese correo, la entrada le aparece sola. Puedes cancelarlo desde Mis tickets mientras tanto.",
      [{ text: "Listo", onPress: () => router.back() }]
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ChevronRight color={color.text} />
          </View>
        </Pressable>
        <Text style={styles.title}>Regalar entrada</Text>
        <InfoTip label="Regalar entrada" size={18} />
      </View>

      {!ticket || !event ? (
        <Text style={[styles.hint, { paddingHorizontal: spacing.screenX }]}>No encontramos esta entrada.</Text>
      ) : (
        <View style={styles.section}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.hint}>{formatEventDate(event.startsAt)}</Text>
          <Text style={[styles.hint, { marginTop: 14 }]}>
            Escribe el correo con el que esa persona usa (o usará) Plann. Al regalarla, tu QR se anula y le llega uno nuevo a ella.
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Correo de quien recibe"
            placeholderTextColor={color.text4}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { marginTop: 14 }]}
          />
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Mensaje (opcional)"
            placeholderTextColor={color.text4}
            maxLength={300}
            multiline
            style={[styles.input, styles.textArea]}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton label="Regalar" disabled={!validEmail} loading={sending} onPress={confirm} style={{ marginTop: 14 }} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.screenX, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  title: { fontFamily: fontFamily.extraBold, fontSize: 18, color: color.text },
  section: { paddingHorizontal: spacing.screenX },
  eventTitle: { fontFamily: fontFamily.extraBold, fontSize: 20, color: color.text },
  hint: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19, color: color.text3, marginTop: 3 },
  input: { height: 50, borderRadius: radius.field, paddingHorizontal: 16, backgroundColor: "rgba(255,255,255,0.09)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", fontFamily: fontFamily.regular, fontSize: 14, color: color.text, marginBottom: 10 },
  textArea: { height: 90, paddingTop: 14, textAlignVertical: "top" },
  error: { fontFamily: fontFamily.semiBold, fontSize: 13, color: color.pink, marginTop: 4 },
});
