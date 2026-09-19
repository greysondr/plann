import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../../../src/components/GlassCard";
import { Chip } from "../../../src/components/Chip";
import { ChevronRight } from "../../../src/components/icons";
import { useAppStore, useEvent } from "../../../src/context/AppStore";
import { useOrganizerGuard } from "../../../src/hooks/useOrganizerGuard";
import { formatUsd } from "../../../src/core/pricing";
import { color, fontFamily, spacing } from "../../../src/theme/tokens";
import { InfoTip } from "../../../src/components/InfoTip";

const PCTS = [10, 20, 30, 50];
const HOURS = [6, 12, 24, 48];

export default function OfertasScreen() {
  const allowed = useOrganizerGuard();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const event = useEvent(id);
  const { setLastMinute, setEventCommunity } = useAppStore();
  const [message, setMessage] = useState<string | null>(null);

  if (!allowed) return null;

  async function save(action: Promise<{ ok: boolean; reason?: string }>) {
    const r = await action;
    setMessage(r.ok ? null : r.reason ?? "No se pudo guardar.");
  }

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 60 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ChevronRight color={color.text} />
          </View>
        </Pressable>
        <Text style={styles.title}>Ofertas y comunidad</Text>
        <InfoTip label="Ofertas y comunidad" size={18} />
      </View>

      {!event ? (
        <Text style={[styles.hint, { paddingHorizontal: spacing.screenX }]}>No encontramos este evento.</Text>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            {message && <Text style={styles.error}>{message}</Text>}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evento comunitario</Text>
            <Text style={styles.hint}>
              Ferias, deporte, cultura o encuentros sin fines de lucro. Aparece en la sección «Gratis y comunitarios» de la portada, junto a los eventos gratuitos.
            </Text>
            <View style={styles.chips}>
              <Chip label="Sí" selected={!!event.isCommunity} onPress={() => save(setEventCommunity(event.id, true))} />
              <Chip label="No" selected={!event.isCommunity} onPress={() => save(setEventCommunity(event.id, false))} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Oferta de última hora</Text>
            <Text style={styles.hint}>
              Llena los cupos que sobran: el descuento se aplica solo cuando faltan pocas horas para el evento. Avisamos a quienes vigilan el precio y a tus seguidores. Lo absorbes tú; no se suma a cupones ni al descuento de cumpleaños (rige el mayor).
            </Text>
            <View style={{ gap: 12, marginTop: 12 }}>
              {event.ticketTypes
                .filter((t) => t.priceCents > 0)
                .map((t) => (
                  <GlassCard key={t.id} level="card">
                    <View style={{ padding: 14, gap: 10 }}>
                      <Text style={styles.ticketName}>
                        {t.name} · {formatUsd(t.priceCents)}
                      </Text>
                      <Text style={styles.label}>Descuento</Text>
                      <View style={styles.chips}>
                        {PCTS.map((p) => (
                          <Chip key={p} label={`${p}%`} selected={t.lastMinutePct === p} onPress={() => save(setLastMinute(t.id, p, t.lastMinuteHours ?? 24))} />
                        ))}
                      </View>
                      {t.lastMinutePct ? (
                        <>
                          <Text style={styles.label}>Se activa desde</Text>
                          <View style={styles.chips}>
                            {HOURS.map((h) => (
                              <Chip key={h} label={`${h} h antes`} selected={t.lastMinuteHours === h} onPress={() => save(setLastMinute(t.id, t.lastMinutePct!, h))} />
                            ))}
                          </View>
                          <Pressable onPress={() => save(setLastMinute(t.id, null, null))} style={{ alignSelf: "flex-start" }}>
                            <Text style={styles.remove}>Quitar oferta</Text>
                          </Pressable>
                        </>
                      ) : null}
                    </View>
                  </GlassCard>
                ))}
              {event.ticketTypes.every((t) => t.priceCents === 0) && <Text style={styles.hint}>Este evento es gratuito: no hay precio que rebajar.</Text>}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.screenX, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  title: { fontFamily: fontFamily.extraBold, fontSize: 18, color: color.text },
  section: { paddingHorizontal: spacing.screenX, marginBottom: 24 },
  eventTitle: { fontFamily: fontFamily.extraBold, fontSize: 20, color: color.text },
  sectionTitle: { fontFamily: fontFamily.extraBold, fontSize: 16, color: color.text, marginBottom: 6 },
  hint: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19, color: color.text3 },
  label: { fontFamily: fontFamily.bold, fontSize: 12.5, color: color.text2 },
  ticketName: { fontFamily: fontFamily.bold, fontSize: 14.5, color: color.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  remove: { fontFamily: fontFamily.bold, fontSize: 13, color: color.text3 },
  error: { fontFamily: fontFamily.semiBold, fontSize: 13, color: color.pink, marginTop: 8 },
});
