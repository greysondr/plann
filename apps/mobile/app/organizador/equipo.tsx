import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../../src/components/GlassCard";
import { PrimaryButton } from "../../src/components/Button";
import { ChevronRight } from "../../src/components/icons";
import { useAppStore } from "../../src/context/AppStore";
import { useOrganizerGuard } from "../../src/hooks/useOrganizerGuard";
import { color, fontFamily, radius, spacing } from "../../src/theme/tokens";

export default function EquipoScreen() {
  const allowed = useOrganizerGuard();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { staff, addStaff, removeStaff } = useAppStore();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  if (!allowed) return null;

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());

  async function handleAdd() {
    setSending(true);
    setMessage(null);
    const result = await addStaff(email.trim());
    setSending(false);
    if (result.ok) {
      setEmail("");
      setMessage({ text: "Listo. Ya puede validar entradas de todos tus eventos.", error: false });
    } else {
      setMessage({ text: result.reason ?? "No se pudo agregar.", error: true });
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
        <Text style={styles.title}>Equipo de puerta</Text>
        <View style={{ width: 18 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.intro}>
          El personal de puerta solo valida entradas en la entrada del evento. No ve tus ventas, tu saldo ni los datos de los compradores.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Agregar persona</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Correo con el que se registró en Plann"
          placeholderTextColor={color.text4}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        {message && <Text style={[styles.message, message.error && styles.messageError]}>{message.text}</Text>}
        <PrimaryButton label="Agregar al equipo" disabled={!validEmail} loading={sending} onPress={handleAdd} style={{ marginTop: 12 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tu equipo</Text>
        {staff.length === 0 ? (
          <Text style={styles.hint}>Todavía no has agregado a nadie.</Text>
        ) : (
          <View style={{ gap: 10, marginTop: 6 }}>
            {staff.map((member) => (
              <GlassCard key={member.id} level="card">
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{member.name}</Text>
                    {member.name !== member.email && <Text style={styles.hint}>{member.email}</Text>}
                  </View>
                  <Pressable onPress={() => removeStaff(member.id)} hitSlop={8}>
                    <Text style={styles.remove}>Quitar</Text>
                  </Pressable>
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
  intro: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 21, color: color.text2 },
  sectionTitle: { fontFamily: fontFamily.extraBold, fontSize: 16, color: color.text, marginBottom: 10 },
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
  message: { fontFamily: fontFamily.semiBold, fontSize: 13, color: color.text2, marginTop: 12 },
  messageError: { color: color.pink },
  hint: { fontFamily: fontFamily.regular, fontSize: 12.5, color: color.text3, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  name: { fontFamily: fontFamily.bold, fontSize: 14.5, color: color.text },
  remove: { fontFamily: fontFamily.bold, fontSize: 13, color: color.text3 },
});
