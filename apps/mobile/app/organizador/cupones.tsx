import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../../src/components/GlassCard";
import { Chip } from "../../src/components/Chip";
import { PrimaryButton } from "../../src/components/Button";
import { ChevronRight } from "../../src/components/icons";
import { useAppStore, type Coupon } from "../../src/context/AppStore";
import { useOrganizerGuard } from "../../src/hooks/useOrganizerGuard";
import { formatUsd } from "../../src/core/pricing";
import { formatShortDate } from "../../src/utils/format";
import { color, fontFamily, radius, spacing } from "../../src/theme/tokens";

function describe(c: Coupon): string {
  return c.discountType === "percent" ? `${c.discountValue}% de descuento` : `${formatUsd(c.discountValue)} de descuento`;
}

export default function CuponesScreen() {
  const allowed = useOrganizerGuard();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { coupons, events, myOrganizerId, createCoupon, setCouponActive, deleteCoupon } = useAppStore();

  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("");
  const [eventId, setEventId] = useState<string | null>(null);
  const [maxUses, setMaxUses] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!allowed) return null;

  const mine = events.filter((e) => e.organizerId === myOrganizerId && !["cancelled", "finished"].includes(e.status ?? ""));
  const eventTitle = (id: string | null) => (id ? events.find((e) => e.id === id)?.title ?? "Un evento" : "Todos mis eventos");

  const numeric = parseFloat(value.replace(",", "."));
  const discountValue = type === "percent" ? Math.round(numeric) : Math.round(numeric * 100);
  const validValue = Number.isFinite(numeric) && numeric > 0 && (type === "fixed" || discountValue <= 100);
  const uses = maxUses.trim() === "" ? null : parseInt(maxUses, 10);
  const validUses = uses === null || (Number.isInteger(uses) && uses > 0);
  const canSave = /^[A-Za-z0-9_-]{3,20}$/.test(code.trim()) && validValue && validUses;

  async function save() {
    setSaving(true);
    setMessage(null);
    const result = await createCoupon({ code, discountType: type, discountValue, eventId, maxUses: uses });
    setSaving(false);
    if (result.ok) {
      setCreating(false);
      setCode("");
      setValue("");
      setMaxUses("");
      setEventId(null);
    } else {
      setMessage(result.reason ?? "No se pudo crear el cupón.");
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
        <Text style={styles.title}>Cupones</Text>
        <View style={{ width: 18 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.intro}>Los cupones rebajan el precio al comprar. El descuento lo absorbes tú: la comisión de Plann se calcula sobre lo que realmente pagan.</Text>
      </View>

      {!creating ? (
        <View style={styles.section}>
          <PrimaryButton label="Crear cupón" onPress={() => setCreating(true)} />
        </View>
      ) : (
        <View style={styles.section}>
          <GlassCard level="card">
            <View style={{ padding: 16, gap: 12 }}>
              <Text style={styles.label}>Código</Text>
              <TextInput value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} placeholder="Ej. AMIGOS20" placeholderTextColor={color.text4} style={styles.input} />

              <Text style={styles.label}>Tipo de descuento</Text>
              <View style={styles.chips}>
                <Chip label="Porcentaje" selected={type === "percent"} onPress={() => setType("percent")} />
                <Chip label="Monto fijo" selected={type === "fixed"} onPress={() => setType("fixed")} />
              </View>
              <TextInput value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder={type === "percent" ? "Porcentaje, ej. 20" : "Monto en USD, ej. 5"} placeholderTextColor={color.text4} style={styles.input} />

              <Text style={styles.label}>Aplica a</Text>
              <View style={styles.chips}>
                <Chip label="Todos mis eventos" selected={eventId === null} onPress={() => setEventId(null)} />
                {mine.map((e) => (
                  <Chip key={e.id} label={e.title.length > 26 ? `${e.title.slice(0, 25)}…` : e.title} selected={eventId === e.id} onPress={() => setEventId(e.id)} />
                ))}
              </View>

              <Text style={styles.label}>Usos máximos (opcional)</Text>
              <TextInput value={maxUses} onChangeText={setMaxUses} keyboardType="number-pad" placeholder="Sin límite" placeholderTextColor={color.text4} style={styles.input} />
              <Text style={styles.hint}>Cada persona puede usar el cupón una sola vez.</Text>

              {message && <Text style={styles.error}>{message}</Text>}
              <PrimaryButton label="Guardar cupón" disabled={!canSave} loading={saving} onPress={save} />
              <Pressable onPress={() => setCreating(false)} style={{ alignSelf: "center" }}>
                <Text style={styles.hint}>Cancelar</Text>
              </Pressable>
            </View>
          </GlassCard>
        </View>
      )}

      <View style={styles.section}>
        {coupons.length === 0 ? (
          <Text style={styles.hint}>Todavía no has creado cupones.</Text>
        ) : (
          <View style={{ gap: 12 }}>
            {coupons.map((c) => (
              <GlassCard key={c.id} level="card">
                <View style={{ padding: 14, gap: 6 }}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.code}>{c.code}</Text>
                    <Text style={[styles.status, !c.active && { color: color.text4 }]}>{c.active ? "Activo" : "Pausado"}</Text>
                  </View>
                  <Text style={styles.discount}>{describe(c)}</Text>
                  <Text style={styles.hint}>
                    {eventTitle(c.eventId)} · {c.uses}
                    {c.maxUses ? ` de ${c.maxUses}` : ""} {c.uses === 1 ? "uso" : "usos"}
                    {c.validUntil ? ` · vence ${formatShortDate(c.validUntil)}` : ""}
                  </Text>
                  <View style={styles.actions}>
                    <Pressable style={styles.chip} onPress={() => setCouponActive(c.id, !c.active)}>
                      <Text style={styles.chipText}>{c.active ? "Pausar" : "Activar"}</Text>
                    </Pressable>
                    <Pressable style={styles.chip} onPress={() => deleteCoupon(c.id)}>
                      <Text style={styles.chipText}>Eliminar</Text>
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
  header: { paddingHorizontal: spacing.screenX, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  title: { fontFamily: fontFamily.extraBold, fontSize: 18, color: color.text },
  section: { paddingHorizontal: spacing.screenX, marginBottom: 20 },
  intro: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 20, color: color.text2 },
  label: { fontFamily: fontFamily.bold, fontSize: 13, color: color.text2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: { height: 48, borderRadius: radius.field, paddingHorizontal: 16, backgroundColor: "rgba(255,255,255,0.09)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", fontFamily: fontFamily.regular, fontSize: 14, color: color.text },
  hint: { fontFamily: fontFamily.regular, fontSize: 12.5, color: color.text3, lineHeight: 18 },
  error: { fontFamily: fontFamily.semiBold, fontSize: 13, color: color.pink },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  code: { fontFamily: fontFamily.extraBold, fontSize: 17, color: color.text, letterSpacing: 0.5 },
  status: { fontFamily: fontFamily.bold, fontSize: 12, color: color.pink },
  discount: { fontFamily: fontFamily.bold, fontSize: 14, color: color.text2 },
  actions: { flexDirection: "row", gap: 8, marginTop: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  chipText: { fontFamily: fontFamily.semiBold, fontSize: 12.5, color: color.text2 },
});
