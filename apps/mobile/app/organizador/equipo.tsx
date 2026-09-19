import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../../src/components/GlassCard";
import { PrimaryButton } from "../../src/components/Button";
import { Chip } from "../../src/components/Chip";
import { ChevronRight } from "../../src/components/icons";
import { useAppStore, type StaffRole } from "../../src/context/AppStore";
import { useOrganizerGuard } from "../../src/hooks/useOrganizerGuard";
import { color, fontFamily, radius, spacing } from "../../src/theme/tokens";
import { HelpTitle, InfoTip } from "../../src/components/InfoTip";

const LIMIT = { basico: 1, pro: 5, business: 50 } as const;
const ROLE_INFO: Record<StaffRole, { label: string; hint: string }> = {
  door: { label: "Puerta", hint: "Solo valida entradas desde su teléfono. No ve ventas ni compradores." },
  editor: { label: "Editor", hint: "Publica y edita eventos, cupones, cortesías y mensajes. No ve retiros, no cancela ni reembolsa." },
  finance: { label: "Finanzas", hint: "Solo lectura de ventas, saldo, retiros y reportes. No edita nada ni retira." },
};

export default function EquipoScreen() {
  const allowed = useOrganizerGuard();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { staff, staffInvites, addStaff, removeStaff, cancelStaffInvite, organizerProfile } = useAppStore();
  const [role, setRole] = useState<StaffRole>("door");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  if (!allowed) return null;

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());

  async function handleAdd() {
    setSending(true);
    setMessage(null);
    const result = await addStaff(email.trim(), role);
    setSending(false);
    if (result.ok) {
      setEmail("");
      setMessage({ text: result.invited ? "Invitación guardada. Cuando cree su cuenta en Plann entrará al equipo sola." : "Listo. Ya forma parte de tu equipo.", error: false });
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
        <Text style={styles.title}>Equipo</Text>
        <InfoTip label="Equipo y roles" size={18} />
      </View>

      <View style={styles.section}>
        <Text style={styles.intro}>
          Cada rol solo ve y hace lo que le corresponde. Tu plan permite {LIMIT[organizerProfile?.plan ?? "basico"]} {LIMIT[organizerProfile?.plan ?? "basico"] === 1 ? "persona" : "personas"}; llevas {staff.length + staffInvites.length}.
        </Text>
      </View>

      <View style={styles.section}>
        <HelpTitle style={styles.sectionTitle}>Agregar persona</HelpTitle>
        <View style={styles.roleChips}>
          {(Object.keys(ROLE_INFO) as StaffRole[]).map((r) => (
            <Chip key={r} label={ROLE_INFO[r].label} selected={role === r} onPress={() => setRole(r)} />
          ))}
        </View>
        <Text style={styles.hint}>{ROLE_INFO[role].hint}</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Correo de la persona"
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
        <HelpTitle style={styles.sectionTitle}>Tu equipo</HelpTitle>
        {staff.length === 0 && staffInvites.length === 0 ? (
          <Text style={styles.hint}>Todavía no has agregado a nadie.</Text>
        ) : (
          <View style={{ gap: 10, marginTop: 6 }}>
            {staff.map((member) => (
              <GlassCard key={member.id} level="card">
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{member.name}</Text>
                    <Text style={styles.hint}>
                      {ROLE_INFO[member.role].label}
                      {member.name !== member.email ? ` · ${member.email}` : ""}
                    </Text>
                  </View>
                  <Pressable onPress={() => removeStaff(member.id)} hitSlop={8}>
                    <Text style={styles.remove}>Quitar</Text>
                  </Pressable>
                </View>
              </GlassCard>
            ))}
            {staffInvites.map((inv) => (
              <GlassCard key={inv.id} level="card">
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{inv.email}</Text>
                    <Text style={styles.hint}>{ROLE_INFO[inv.role].label} · Invitada, aún sin cuenta</Text>
                  </View>
                  <Pressable onPress={() => cancelStaffInvite(inv.id)} hitSlop={8}>
                    <Text style={styles.remove}>Cancelar</Text>
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
  roleChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  message: { fontFamily: fontFamily.semiBold, fontSize: 13, color: color.text2, marginTop: 12 },
  messageError: { color: color.pink },
  hint: { fontFamily: fontFamily.regular, fontSize: 12.5, color: color.text3, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  name: { fontFamily: fontFamily.bold, fontSize: 14.5, color: color.text },
  remove: { fontFamily: fontFamily.bold, fontSize: 13, color: color.text3 },
});
