import React, { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { GlassCard } from "../../src/components/GlassCard";
import { Chip } from "../../src/components/Chip";
import { PrimaryButton } from "../../src/components/Button";
import { ChevronRight } from "../../src/components/icons";
import { useAppStore } from "../../src/context/AppStore";
import { useOrganizerGuard } from "../../src/hooks/useOrganizerGuard";
import type { PaymentMethod } from "../../src/core/types";
import { color, fontFamily, radius, spacing } from "../../src/theme/tokens";

const METHODS: { id: PaymentMethod; label: string; hint: string }[] = [
  { id: "pago_movil", label: "Pago Móvil", hint: "Banco, teléfono y cédula" },
  { id: "transfer", label: "Transferencia", hint: "Banco, número de cuenta y titular" },
  { id: "zelle", label: "Zelle", hint: "Correo o teléfono de tu cuenta Zelle" },
];
const PLAN_LABEL: Record<string, string> = { basico: "Básico", pro: "Pro", business: "Business" };

export default function NegocioScreen() {
  const allowed = useOrganizerGuard();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { organizerProfile, updateOrganizerProfile, setBirthdayPct } = useAppStore();

  const [name, setName] = useState(organizerProfile?.name ?? "");
  const [bio, setBio] = useState(organizerProfile?.bio ?? "");
  const [phone, setPhone] = useState(organizerProfile?.phone ?? "");
  const [method, setMethod] = useState<PaymentMethod>(organizerProfile?.payoutMethod ?? "pago_movil");
  const [account, setAccount] = useState(organizerProfile?.payoutAccount ?? "");
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  if (!allowed) return null;

  async function pickLogo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Necesitamos acceso a tus fotos", "Actívalo desde Ajustes para poder elegir una imagen.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (!result.canceled && result.assets[0]) setLogoUri(result.assets[0].uri);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    const result = await updateOrganizerProfile({
      name: name.trim(),
      bio: bio.trim(),
      phone: phone.trim(),
      payoutMethod: account.trim() ? method : undefined,
      payoutAccount: account.trim(),
      logoUri: logoUri ?? undefined,
    });
    setSaving(false);
    setMessage(result.ok ? { text: "Perfil actualizado.", error: false } : { text: result.reason ?? "No se pudo guardar.", error: true });
    if (result.ok) setLogoUri(null);
  }

  const shownLogo = logoUri ?? organizerProfile?.logoUrl;

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 80 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ChevronRight color={color.text} />
          </View>
        </Pressable>
        <Text style={styles.title}>Mi negocio</Text>
        <View style={{ width: 18 }} />
      </View>

      <View style={styles.section}>
        <GlassCard level="card">
          <View style={styles.infoRow}>
            <Info label="Plan" value={PLAN_LABEL[organizerProfile?.plan ?? "basico"]} />
            <Info label="Comisión Plann" value={`${Math.round((organizerProfile?.commissionRate ?? 0.12) * 100)}%`} />
            <Info label="Verificación" value="Verificado" />
          </View>
        </GlassCard>
      </View>

      <View style={styles.section}>
        <Pressable style={styles.logoRow} onPress={pickLogo}>
          {shownLogo ? <Image source={{ uri: shownLogo }} style={styles.logo} /> : <View style={[styles.logo, styles.logoEmpty]} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Logo</Text>
            <Text style={styles.hint}>Toca para elegir una imagen cuadrada.</Text>
          </View>
        </Pressable>

        <Text style={[styles.label, { marginTop: 18 }]}>Nombre del negocio</Text>
        <TextInput value={name} onChangeText={setName} style={styles.input} placeholderTextColor={color.text4} />

        <Text style={[styles.label, { marginTop: 14 }]}>Descripción pública</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          multiline
          placeholder="Cuéntale a la gente quién eres y qué organizas"
          placeholderTextColor={color.text4}
          style={[styles.input, styles.textArea]}
        />

        <Text style={[styles.label, { marginTop: 14 }]}>Teléfono de contacto</Text>
        <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0414-0000000" placeholderTextColor={color.text4} style={styles.input} />

        <Text style={[styles.label, { marginTop: 18 }]}>Descuento de cumpleaños</Text>
        <Text style={[styles.hint, { marginBottom: 8 }]}>Descuento automático para quien cumple años (3 días antes y después) en todos tus eventos. Lo absorbes tú.</Text>
        <View style={styles.chipsWrap}>
          {[0, 10, 15, 20, 30].map((p) => (
            <Chip key={p} label={p === 0 ? "Sin descuento" : `${p}%`} selected={(organizerProfile?.birthdayPct ?? 0) === p} onPress={() => setBirthdayPct(p)} />
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 18 }]}>Cuenta para recibir tus pagos</Text>
        <View style={styles.chipsWrap}>
          {METHODS.map((m) => (
            <Chip key={m.id} label={m.label} selected={method === m.id} onPress={() => setMethod(m.id)} />
          ))}
        </View>
        <TextInput
          value={account}
          onChangeText={setAccount}
          autoCapitalize="none"
          placeholder={METHODS.find((m) => m.id === method)?.hint}
          placeholderTextColor={color.text4}
          style={[styles.input, { marginTop: 10 }]}
        />

        {message && <Text style={[styles.message, message.error && { color: color.pink }]}>{message.text}</Text>}
        <PrimaryButton label="Guardar cambios" disabled={name.trim().length < 3} loading={saving} onPress={save} style={{ marginTop: 16 }} />
      </View>
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={styles.hint}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.screenX, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  title: { fontFamily: fontFamily.extraBold, fontSize: 18, color: color.text },
  section: { paddingHorizontal: spacing.screenX, marginBottom: 22 },
  infoRow: { flexDirection: "row", padding: 16, gap: 10 },
  infoValue: { fontFamily: fontFamily.extraBold, fontSize: 15, color: color.text },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  logo: { width: 64, height: 64, borderRadius: 18 },
  logoEmpty: { backgroundColor: "rgba(255,255,255,0.08)" },
  label: { fontFamily: fontFamily.bold, fontSize: 13, color: color.text2, marginBottom: 8 },
  hint: { fontFamily: fontFamily.regular, fontSize: 12.5, color: color.text3 },
  input: {
    minHeight: 50,
    borderRadius: radius.field,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: color.text,
  },
  textArea: { height: 90, paddingTop: 14, textAlignVertical: "top" },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  message: { fontFamily: fontFamily.semiBold, fontSize: 13, color: color.text2, marginTop: 12 },
});
