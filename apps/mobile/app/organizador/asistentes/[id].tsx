import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../../../src/components/GlassCard";
import { ChevronRight } from "../../../src/components/icons";
import { useAppStore, useEvent, type Attendee } from "../../../src/context/AppStore";
import { useOrganizerGuard } from "../../../src/hooks/useOrganizerGuard";
import { formatUsd } from "../../../src/core/pricing";
import { normalizeSearch } from "../../../src/utils/format";
import { PrimaryButton } from "../../../src/components/Button";
import { Chip } from "../../../src/components/Chip";
import { color, fontFamily, radius, spacing } from "../../../src/theme/tokens";

const STATUS_LABEL: Record<string, string> = {
  valid: "Pagado",
  used: "Dentro",
  void: "Anulado",
  refunded: "Reembolsado",
};

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export default function AsistentesScreen() {
  const allowed = useOrganizerGuard();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const event = useEvent(id);
  const { fetchAttendees, checkIn, organizerOrders, issueComp, sendAnnouncement } = useAppStore();

  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [panel, setPanel] = useState<null | "invitar" | "avisar">(null);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestQty, setGuestQty] = useState(1);
  const [guestNote, setGuestNote] = useState("");
  const [typeId, setTypeId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setAttendees(await fetchAttendees(id));
    setLoaded(true);
  }, [id, fetchAttendees]);

  // organizerOrders cambia en tiempo real cuando alguien compra o se aprueba un pago.
  useEffect(() => {
    if (allowed) load();
  }, [allowed, load, organizerOrders]);

  const active = useMemo(() => attendees.filter((a) => a.status === "valid" || a.status === "used"), [attendees]);
  const checkedIn = active.filter((a) => a.status === "used").length;

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return attendees;
    return attendees.filter((a) => normalizeSearch(`${a.name} ${a.code} ${a.ticketTypeName}`).includes(q));
  }, [attendees, query]);

  if (!allowed || !event) return null;

  const closed = event.status === "cancelled" || event.status === "finished";
  const selectedType = event.ticketTypes.find((t) => t.id === typeId) ?? event.ticketTypes[0];

  async function sendComp() {
    if (!selectedType) return;
    setWorking(true);
    setFeedback(null);
    const result = await issueComp(selectedType.id, guestEmail, guestQty, guestNote);
    setWorking(false);
    if (result.ok) {
      setFeedback({
        text: result.invited
          ? `${guestEmail.trim()} todavía no tiene cuenta en Plann. Guardamos ${guestQty === 1 ? "su entrada" : "sus entradas"}: le aparecerán solas cuando se registre con ese correo.`
          : `Listo. ${guestEmail.trim()} ya tiene ${guestQty === 1 ? "su entrada" : "sus entradas"} en la app.`,
        error: false,
      });
      setGuestEmail("");
      setGuestNote("");
      load();
    } else {
      setFeedback({ text: result.reason ?? "No se pudo enviar.", error: true });
    }
  }

  async function sendMessage() {
    setWorking(true);
    setFeedback(null);
    const result = await sendAnnouncement(event!.id, announcement);
    setWorking(false);
    if (result.ok) {
      setFeedback({ text: `Mensaje enviado a ${result.recipients} ${result.recipients === 1 ? "persona" : "personas"}.`, error: false });
      setAnnouncement("");
    } else {
      setFeedback({ text: result.reason ?? "No se pudo enviar.", error: true });
    }
  }

  async function manualCheckIn(attendee: Attendee) {
    setBusyCode(attendee.code);
    await checkIn(attendee.code, id);
    await load();
    setBusyCode(null);
  }

  async function shareList() {
    const header = "Nombre,Entrada,Código,Estado,Hora de ingreso";
    const rows = attendees.map((a) =>
      [
        a.name,
        a.ticketTypeName,
        a.code,
        STATUS_LABEL[a.status] ?? a.status,
        a.checkedInAt ? new Date(a.checkedInAt).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" }) : "",
      ]
        .map(csvEscape)
        .join(",")
    );
    await Share.share({ title: `Asistentes - ${event!.title}`, message: [header, ...rows].join("\n") });
  }

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <View style={{ transform: [{ rotate: "180deg" }] }}>
            <ChevronRight color={color.text} />
          </View>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
        <View style={{ width: 18 }} />
      </View>

      <View style={styles.section}>
        <GlassCard level="card">
          <View style={styles.counterRow}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
              <Text style={styles.counterValue}>
                {checkedIn} / {active.length}
              </Text>
              <Text style={styles.counterLabel}>dentro</Text>
            </View>
            <Pressable onPress={shareList} disabled={attendees.length === 0} style={{ opacity: attendees.length === 0 ? 0.4 : 1 }}>
              <Text style={styles.link}>Compartir lista</Text>
            </Pressable>
          </View>
        </GlassCard>
      </View>

      {!closed && (
        <View style={styles.section}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Chip label="Invitar a alguien" selected={panel === "invitar"} onPress={() => { setPanel(panel === "invitar" ? null : "invitar"); setFeedback(null); }} />
            <Chip label="Avisar a todos" selected={panel === "avisar"} onPress={() => { setPanel(panel === "avisar" ? null : "avisar"); setFeedback(null); }} />
          </View>

          {panel === "invitar" && (
            <GlassCard level="card" style={{ marginTop: 12 }}>
              <View style={{ padding: 16, gap: 10 }}>
                <Text style={styles.panelHint}>Regala entradas de cortesía a alguien que ya tiene cuenta en Plann. No pagan, no cuentan como venta y no dan puntos.</Text>
                <TextInput value={guestEmail} onChangeText={setGuestEmail} placeholder="Correo de tu invitado" placeholderTextColor={color.text4} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} style={styles.search} />
                {event.ticketTypes.length > 1 && (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {event.ticketTypes.map((t) => (
                      <Chip key={t.id} label={t.name} selected={selectedType?.id === t.id} onPress={() => setTypeId(t.id)} />
                    ))}
                  </View>
                )}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <Text style={styles.panelLabel}>Entradas</Text>
                  <Pressable style={styles.stepBtn} onPress={() => setGuestQty((q) => Math.max(1, q - 1))}>
                    <Text style={styles.stepText}>−</Text>
                  </Pressable>
                  <Text style={styles.stepValue}>{guestQty}</Text>
                  <Pressable style={styles.stepBtn} onPress={() => setGuestQty((q) => Math.min(6, q + 1))}>
                    <Text style={styles.stepText}>+</Text>
                  </Pressable>
                </View>
                <TextInput value={guestNote} onChangeText={setGuestNote} placeholder="Nota interna (opcional), ej. Prensa" placeholderTextColor={color.text4} style={styles.search} />
                {feedback && <Text style={[styles.feedback, feedback.error && { color: color.pink }]}>{feedback.text}</Text>}
                <PrimaryButton label="Enviar cortesía" disabled={!/^\S+@\S+\.\S+$/.test(guestEmail.trim())} loading={working} onPress={sendComp} />
              </View>
            </GlassCard>
          )}

          {panel === "avisar" && (
            <GlassCard level="card" style={{ marginTop: 12 }}>
              <View style={{ padding: 16, gap: 10 }}>
                <Text style={styles.panelHint}>Le llega una notificación a cada persona con entrada. Máximo 3 mensajes por evento al día.</Text>
                <TextInput
                  value={announcement}
                  onChangeText={setAnnouncement}
                  placeholder="Ej. Cambiamos el punto de encuentro a la puerta norte"
                  placeholderTextColor={color.text4}
                  multiline
                  maxLength={500}
                  style={[styles.search, { height: 100, paddingTop: 14, textAlignVertical: "top" }]}
                />
                <Text style={styles.panelHint}>{announcement.length}/500</Text>
                {feedback && <Text style={[styles.feedback, feedback.error && { color: color.pink }]}>{feedback.text}</Text>}
                <PrimaryButton label={`Enviar a ${active.length} ${active.length === 1 ? "persona" : "personas"}`} disabled={announcement.trim().length < 5 || active.length === 0} loading={working} onPress={sendMessage} />
              </View>
            </GlassCard>
          )}
        </View>
      )}

      <View style={styles.section}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por nombre o código"
          placeholderTextColor={color.text4}
          autoCapitalize="none"
          style={styles.search}
        />
      </View>

      <View style={styles.section}>
        <View style={{ gap: 10 }}>
          {loaded && attendees.length === 0 && <Text style={styles.emptyText}>Aún no hay ventas.</Text>}
          {loaded && attendees.length > 0 && filtered.length === 0 && <Text style={styles.emptyText}>Nadie coincide con esa búsqueda.</Text>}
          {filtered.map((a) => (
            <GlassCard key={a.ticketId} level="field">
              <View style={styles.attendeeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.attendeeName}>{a.name}</Text>
                  <Text style={styles.attendeeCode}>
                    {a.code} · {a.ticketTypeName}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  {a.status === "valid" ? (
                    <Pressable style={styles.checkButton} disabled={busyCode === a.code} onPress={() => manualCheckIn(a)}>
                      <Text style={styles.checkButtonText}>{busyCode === a.code ? "..." : "Dar entrada"}</Text>
                    </Pressable>
                  ) : (
                    <Text style={[styles.attendeeStatus, a.status === "used" && { color: color.pink }]}>{STATUS_LABEL[a.status] ?? a.status}</Text>
                  )}
                  <Text style={styles.attendeeMethod}>{formatUsd(a.totalCents)}</Text>
                </View>
              </View>
            </GlassCard>
          ))}
        </View>
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
  title: {
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
    color: color.text,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
  },
  section: { paddingHorizontal: spacing.screenX, marginBottom: 16 },
  counterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  counterValue: { fontFamily: fontFamily.extraBold, fontSize: 26, color: color.text },
  counterLabel: { fontFamily: fontFamily.semiBold, fontSize: 13, color: color.text3 },
  link: { fontFamily: fontFamily.bold, fontSize: 13, color: color.pink },
  search: {
    height: 46,
    borderRadius: radius.field,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: color.text,
  },
  panelHint: { fontFamily: fontFamily.regular, fontSize: 12.5, lineHeight: 18, color: color.text3 },
  panelLabel: { fontFamily: fontFamily.bold, fontSize: 13, color: color.text2 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  stepText: { fontFamily: fontFamily.bold, fontSize: 18, color: color.text },
  stepValue: { fontFamily: fontFamily.extraBold, fontSize: 16, color: color.text, minWidth: 18, textAlign: "center" },
  feedback: { fontFamily: fontFamily.semiBold, fontSize: 13, color: color.text2 },
  emptyText: { fontFamily: fontFamily.regular, fontSize: 13, color: color.text3 },
  attendeeRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  attendeeName: { fontFamily: fontFamily.bold, fontSize: 14.5, color: color.text },
  attendeeCode: { fontFamily: fontFamily.semiBold, fontSize: 12, color: color.text3, marginTop: 2 },
  attendeeStatus: { fontFamily: fontFamily.bold, fontSize: 12.5, color: color.text3 },
  attendeeMethod: { fontFamily: fontFamily.semiBold, fontSize: 11.5, color: color.text4 },
  checkButton: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: color.pink,
    alignItems: "center",
    justifyContent: "center",
  },
  checkButtonText: { fontFamily: fontFamily.bold, fontSize: 12.5, color: color.white },
});
