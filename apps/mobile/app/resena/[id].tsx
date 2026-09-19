import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "../../src/components/Button";
import { ChevronRight } from "../../src/components/icons";
import { useAppStore, useEvent } from "../../src/context/AppStore";
import { color, fontFamily, radius, spacing } from "../../src/theme/tokens";
import { InfoTip } from "../../src/components/InfoTip";

const LABELS = ["", "Malo", "Regular", "Bien", "Muy bueno", "Excelente"];

export default function ResenaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const event = useEvent(id);
  const { submitReview } = useAppStore();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!event) return null;

  async function send() {
    setSending(true);
    setMessage(null);
    const result = await submitReview(event!.id, rating, comment);
    setSending(false);
    if (result.ok) setDone(true);
    else setMessage(result.reason ?? "No se pudo enviar tu reseña.");
  }

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ChevronRight color={color.text} />
          </View>
        </Pressable>
        <Text style={styles.title}>Tu reseña</Text>
        <InfoTip label="Calificar evento" size={18} />
      </View>

      {done ? (
        <View style={styles.section}>
          <Text style={styles.big}>Gracias por calificar</Text>
          <Text style={styles.hint}>Tu reseña ayuda a otros a elegir su próximo plan y al organizador a mejorar.</Text>
          <PrimaryButton label="Listo" onPress={() => router.back()} style={{ marginTop: 20 }} />
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.big}>{event.title}</Text>
          <Text style={styles.hint}>¿Cómo estuvo?</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRating(n)} hitSlop={6}>
                <Text style={[styles.star, n <= rating && styles.starOn]}>★</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>{LABELS[rating]}</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={500}
            placeholder="Cuéntanos qué te gustó o qué mejorarías (opcional)"
            placeholderTextColor={color.text4}
            style={styles.input}
          />
          <Text style={styles.hint}>{comment.length}/500 · Tu nombre y la primera letra de tu apellido se muestran junto a tu reseña.</Text>
          {message && <Text style={styles.error}>{message}</Text>}
          <PrimaryButton label="Enviar reseña" disabled={rating === 0} loading={sending} onPress={send} style={{ marginTop: 16 }} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.screenX, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title: { fontFamily: fontFamily.extraBold, fontSize: 18, color: color.text },
  section: { paddingHorizontal: spacing.screenX, gap: 10 },
  big: { fontFamily: fontFamily.extraBold, fontSize: 22, color: color.text },
  hint: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19, color: color.text3 },
  stars: { flexDirection: "row", gap: 10, marginTop: 8 },
  star: { fontSize: 44, color: "rgba(255,255,255,0.18)" },
  starOn: { color: color.pink },
  label: { fontFamily: fontFamily.bold, fontSize: 14, color: color.text2, minHeight: 20 },
  input: { minHeight: 110, borderRadius: radius.field, paddingHorizontal: 16, paddingTop: 14, backgroundColor: "rgba(255,255,255,0.09)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", fontFamily: fontFamily.regular, fontSize: 14, color: color.text, textAlignVertical: "top" },
  error: { fontFamily: fontFamily.semiBold, fontSize: 13, color: color.pink },
});
