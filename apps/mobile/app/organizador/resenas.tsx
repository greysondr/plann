import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../../src/components/GlassCard";
import { ChevronRight } from "../../src/components/icons";
import { useAppStore, type Review } from "../../src/context/AppStore";
import { useOrganizerGuard } from "../../src/hooks/useOrganizerGuard";
import { formatShortDate } from "../../src/utils/format";
import { color, fontFamily, radius, spacing } from "../../src/theme/tokens";

export default function ResenasScreen() {
  const allowed = useOrganizerGuard();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { events, fetchOrganizerReviews, replyToReview, ratingSummary, followerCount } = useAppStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [replying, setReplying] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => setReviews(await fetchOrganizerReviews()), [fetchOrganizerReviews]);
  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  if (!allowed) return null;

  const title = (id: string) => events.find((e) => e.id === id)?.title ?? "Evento";
  const unanswered = reviews.filter((r) => !r.reply).length;

  async function send(id: string) {
    setBusy(true);
    setMessage(null);
    const result = await replyToReview(id, text);
    setBusy(false);
    if (result.ok) {
      setReplying(null);
      setText("");
      load();
    } else setMessage(result.reason ?? "No se pudo enviar.");
  }

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ChevronRight color={color.text} />
          </View>
        </Pressable>
        <Text style={styles.title}>Reseñas</Text>
        <View style={{ width: 18 }} />
      </View>

      <View style={styles.section}>
        <View style={styles.grid}>
          <GlassCard level="card" style={{ width: "31%" }}>
            <View style={styles.kpi}>
              <Text style={styles.meta}>Calificación</Text>
              <Text style={styles.kpiValue}>{ratingSummary.avg === null ? "—" : ratingSummary.avg.toFixed(1)}</Text>
            </View>
          </GlassCard>
          <GlassCard level="card" style={{ width: "31%" }}>
            <View style={styles.kpi}>
              <Text style={styles.meta}>Reseñas</Text>
              <Text style={styles.kpiValue}>{ratingSummary.count}</Text>
            </View>
          </GlassCard>
          <GlassCard level="card" style={{ width: "31%" }}>
            <View style={styles.kpi}>
              <Text style={styles.meta}>Seguidores</Text>
              <Text style={styles.kpiValue}>{followerCount}</Text>
            </View>
          </GlassCard>
        </View>
        {unanswered > 0 && <Text style={[styles.meta, { marginTop: 10 }]}>{unanswered} sin responder</Text>}
      </View>

      <View style={styles.section}>
        {reviews.length === 0 ? (
          <Text style={styles.meta}>Todavía no tienes reseñas. Quienes asistan a tus eventos podrán calificarlos.</Text>
        ) : (
          <View style={{ gap: 12 }}>
            {reviews.map((r) => (
              <GlassCard key={r.id} level="card">
                <View style={{ padding: 14, gap: 6 }}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.author}>{r.authorName}</Text>
                    <Text style={styles.stars}>
                      {"★".repeat(r.rating)}
                      {"☆".repeat(5 - r.rating)}
                    </Text>
                  </View>
                  <Text style={styles.meta}>
                    {title(r.eventId)} · {formatShortDate(r.createdAt)}
                  </Text>
                  {r.comment && <Text style={styles.comment}>{r.comment}</Text>}
                  {r.reply && (
                    <Text style={styles.reply}>
                      <Text style={{ fontFamily: fontFamily.bold, color: color.text2 }}>Tu respuesta: </Text>
                      {r.reply}
                    </Text>
                  )}
                  {replying === r.id ? (
                    <View style={{ gap: 8 }}>
                      <TextInput value={text} onChangeText={setText} multiline maxLength={500} placeholder="Tu respuesta es pública" placeholderTextColor={color.text4} style={styles.input} />
                      {message && <Text style={[styles.meta, { color: color.pink }]}>{message}</Text>}
                      <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
                        <Pressable style={[styles.send, (text.trim().length < 2 || busy) && { opacity: 0.4 }]} disabled={text.trim().length < 2 || busy} onPress={() => send(r.id)}>
                          <Text style={styles.sendText}>{busy ? "..." : "Publicar"}</Text>
                        </Pressable>
                        <Pressable onPress={() => setReplying(null)}>
                          <Text style={styles.meta}>Cancelar</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => {
                        setReplying(r.id);
                        setText(r.reply ?? "");
                        setMessage(null);
                      }}
                    >
                      <Text style={styles.link}>{r.reply ? "Editar respuesta" : "Responder"}</Text>
                    </Pressable>
                  )}
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
  grid: { flexDirection: "row", gap: 10 },
  kpi: { padding: 12, gap: 4 },
  kpiValue: { fontFamily: fontFamily.extraBold, fontSize: 20, color: color.text },
  meta: { fontFamily: fontFamily.semiBold, fontSize: 12, color: color.text3 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  author: { fontFamily: fontFamily.bold, fontSize: 14.5, color: color.text },
  stars: { fontFamily: fontFamily.bold, fontSize: 13.5, color: color.pink },
  comment: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 20, color: color.text2 },
  reply: { fontFamily: fontFamily.regular, fontSize: 12.5, lineHeight: 18, color: color.text3, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: color.pink },
  link: { fontFamily: fontFamily.bold, fontSize: 13, color: color.pink },
  input: { minHeight: 70, borderRadius: radius.field, paddingHorizontal: 14, paddingTop: 12, backgroundColor: "rgba(255,255,255,0.09)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", fontFamily: fontFamily.regular, fontSize: 13.5, color: color.text, textAlignVertical: "top" },
  send: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999, backgroundColor: color.pink },
  sendText: { fontFamily: fontFamily.bold, fontSize: 13, color: color.white },
});
