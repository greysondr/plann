import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "../../src/components/Button";
import { ChevronRight } from "../../src/components/icons";
import { useAppStore } from "../../src/context/AppStore";
import { color, fontFamily, radius, spacing } from "../../src/theme/tokens";

function validDate(d: number, m: number, y: number): boolean {
  if (!d || !m || !y || y < 1920 || y > new Date().getFullYear() - 13) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export default function CumpleanosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { birthDate, setBirthDate } = useAppStore();
  const [initY, initM, initD] = birthDate ? birthDate.split("-") : ["", "", ""];
  const [day, setDay] = useState(initD ? String(Number(initD)) : "");
  const [month, setMonth] = useState(initM ? String(Number(initM)) : "");
  const [year, setYear] = useState(initY);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  const ok = validDate(Number(day), Number(month), Number(year));

  async function save() {
    setSaving(true);
    const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const result = await setBirthDate(iso);
    setSaving(false);
    setMessage(result.ok ? { text: "Guardado. Te avisaremos cuando cumplas años.", error: false } : { text: result.reason ?? "No se pudo guardar.", error: true });
  }

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ChevronRight color={color.text} />
          </View>
        </Pressable>
        <Text style={styles.title}>Mi cumpleaños</Text>
        <View style={{ width: 18 }} />
      </View>
      <View style={styles.section}>
        <Text style={styles.hint}>
          Plann te regala 10% de descuento (hasta $5) en una compra durante los 3 días antes y después de tu cumpleaños, una vez al año. Solo tú ves tu fecha.
        </Text>
        <View style={styles.row}>
          <TextInput value={day} onChangeText={(t) => setDay(t.replace(/\D/g, "").slice(0, 2))} placeholder="Día" placeholderTextColor={color.text4} keyboardType="number-pad" style={[styles.input, { flex: 1 }]} />
          <TextInput value={month} onChangeText={(t) => setMonth(t.replace(/\D/g, "").slice(0, 2))} placeholder="Mes" placeholderTextColor={color.text4} keyboardType="number-pad" style={[styles.input, { flex: 1 }]} />
          <TextInput value={year} onChangeText={(t) => setYear(t.replace(/\D/g, "").slice(0, 4))} placeholder="Año" placeholderTextColor={color.text4} keyboardType="number-pad" style={[styles.input, { flex: 1.4 }]} />
        </View>
        {message && <Text style={[styles.message, message.error && { color: color.pink }]}>{message.text}</Text>}
        <PrimaryButton label="Guardar" disabled={!ok} loading={saving} onPress={save} style={{ marginTop: 14 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.screenX, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  title: { fontFamily: fontFamily.extraBold, fontSize: 18, color: color.text },
  section: { paddingHorizontal: spacing.screenX },
  hint: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 20, color: color.text2 },
  row: { flexDirection: "row", gap: 10, marginTop: 16 },
  input: { height: 50, borderRadius: radius.field, paddingHorizontal: 16, backgroundColor: "rgba(255,255,255,0.09)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", fontFamily: fontFamily.regular, fontSize: 15, color: color.text, textAlign: "center" },
  message: { fontFamily: fontFamily.semiBold, fontSize: 13, color: color.text2, marginTop: 12 },
});
