import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EventImage } from "../../src/components/EventImage";
import { GlassCard } from "../../src/components/GlassCard";
import { PrimaryButton, GhostPillButton } from "../../src/components/Button";
import { ChevronRight, HeartIcon, MapPinIcon, BellIcon, ShareIcon } from "../../src/components/icons";
import { useAppStore, useEvent, type Review } from "../../src/context/AppStore";
import { formatDuration, formatEventDate, formatRating, formatShortDate } from "../../src/utils/format";
import { defaultTicketType, remaining, saleState } from "../../src/core/ticketSales";
import { formatUsd, formatBs, calculateOrderTotals } from "../../src/core/pricing";
import { openInMaps } from "../../src/utils/maps";
import { color, fontFamily, radius, spacing } from "../../src/theme/tokens";

const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? "https://plann.app").replace(/\/$/, "");

const REFUND_LABEL: Record<string, string> = {
  none: "Sin reembolso",
  "24h": "Cancelación gratis hasta 24 h antes",
  "72h": "Cancelación gratis hasta 72 h antes",
  always: "Cancelación gratis en cualquier momento",
};

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const event = useEvent(id);
  const { favorites, toggleFavorite, reminders, toggleReminder, rateApplied, getOrganizer, recordEventView, followedOrganizers, toggleFollow, tickets, fetchEventReviews, myOrganizerId } = useAppStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  useEffect(() => {
    if (id) fetchEventReviews(id).then(setReviews);
  }, [id, fetchEventReviews, event?.ratingCount]);
  useEffect(() => {
    if (id) recordEventView(id);
  }, [id, recordEventView]);
  const [quantity, setQuantity] = useState(1);
  const { width } = useWindowDimensions();
  const [photoIndex, setPhotoIndex] = useState(0);

  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const ticketType = event?.ticketTypes.find((t) => t.id === selectedTypeId) ?? (event ? defaultTicketType(event.ticketTypes) : undefined);
  const organizer = event ? getOrganizer(event.organizerId) : undefined;

  const canReview =
    !!event && !event.sourceCurated && new Date(event.startsAt).getTime() <= Date.now() && tickets.some((t) => t.eventId === event.id && (t.status === "valid" || t.status === "used"));
    const photos = event?.images && event.images.length > 0 ? event.images : event?.imageUrl ? [event.imageUrl] : [];
  const state = ticketType ? saleState(ticketType) : "sold_out";
  // Fuera de la ventana de venta no hay nada que comprar, aunque sobre cupo.
  const finished = event?.status === "finished";
  const available = ticketType && state === "on_sale" && !finished ? remaining(ticketType) : 0;

  const totals = useMemo(() => {
    if (!ticketType) return null;
    return calculateOrderTotals({
      unitPriceCents: ticketType.priceCents,
      quantity,
      commissionRate: 0,
      rateUsed: rateApplied,
    });
  }, [ticketType, quantity, rateApplied]);

  if (!event) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: color.text }}>No encontramos este plan.</Text>
      </View>
    );
  }

  const isFavorite = favorites.includes(event.id);
  const isReminded = reminders.includes(event.id);
  const actionLabel = event.kind === "tour" || event.kind === "experience" ? "Reservar" : "Comprar";

  async function handleToggleReminder() {
    if (!event) return;
    const enabled = await toggleReminder(event.id);
    Alert.alert(
      enabled ? "Listo, te avisamos" : "Recordatorio quitado",
      enabled
        ? "Te mandamos un aviso 2 horas antes de que empiece."
        : "Ya no te vamos a avisar de este plan."
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: event.sourceCurated ? 60 : 140 }} showsVerticalScrollIndicator={false}>
        <View style={styles.gallery}>
          {photos.length > 1 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={StyleSheet.absoluteFill}
              onMomentumScrollEnd={(e) => setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            >
              {photos.map((uri) => (
                <EventImage key={uri} uri={uri} label={event.imageLabel} style={{ width, height: 260 }} />
              ))}
            </ScrollView>
          ) : (
            <EventImage uri={event.imageUrl} label={event.imageLabel} style={StyleSheet.absoluteFill} />
          )}
          {photos.length > 1 && (
            <View style={styles.dots} pointerEvents="none">
              {photos.map((uri, i) => (
                <View key={uri} style={[styles.dot, i === photoIndex && styles.dotActive]} />
              ))}
            </View>
          )}
          <View style={[styles.galleryTop, { top: insets.top + 10 }]}>
            <Pressable style={styles.circleButton} onPress={() => router.back()}>
              <View style={{ transform: [{ rotate: "180deg" }] }}>
                <ChevronRight size={18} color={color.text} />
              </View>
            </Pressable>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {!event.sourceCurated && (
                <Pressable style={styles.circleButton} onPress={handleToggleReminder}>
                  <BellIcon active={isReminded} size={18} />
                </Pressable>
              )}
              {event.slug && !event.sourceCurated && (
                <Pressable
                  style={styles.circleButton}
                  onPress={() =>
                    Share.share({
                      title: event.title,
                      message: `${event.title} · ${formatEventDate(event.startsAt)}\n${WEB_URL}/e/${event.slug}?src=app`,
                    })
                  }
                  accessibilityLabel="Compartir evento"
                >
                  <ShareIcon size={18} />
                </Pressable>
              )}
              <Pressable style={styles.circleButton} onPress={() => toggleFavorite(event.id)}>
                <HeartIcon active={isFavorite} size={18} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.eyebrow}>
            {event.sourceCurated ? "Información" : `${event.category} · ${formatDuration(event.durationMinutes)}`}
          </Text>
          <Text style={styles.title}>{event.title}</Text>

          {organizer && (
            <View style={styles.organizerRow}>
              <Text style={styles.organizerName}>{organizer.name}</Text>
              {organizer.verified && <Text style={styles.verifiedBadge}>Verificado</Text>}
              {organizer.id !== myOrganizerId && (
                <Pressable
                  style={[styles.followBtn, followedOrganizers.includes(organizer.id) && styles.followBtnOn]}
                  onPress={() => toggleFollow(organizer.id)}
                >
                  <Text style={[styles.followText, followedOrganizers.includes(organizer.id) && { color: color.pink }]}>
                    {followedOrganizers.includes(organizer.id) ? "Siguiendo" : "Seguir"}
                  </Text>
                </Pressable>
              )}
              {organizer.ratingCount > 0 && (
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingText}>{formatRating(organizer.ratingAvg, organizer.ratingCount)}</Text>
                </View>
              )}
            </View>
          )}

          <GlassCard level="field" style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha</Text>
              <Text style={styles.infoValue}>{formatEventDate(event.startsAt)}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.lugarRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Lugar</Text>
                  <Text style={styles.infoValue}>{event.venueName}</Text>
                </View>
                <Pressable
                  style={styles.mapButton}
                  onPress={() => openInMaps(event.lat, event.lng, event.venueName)}
                >
                  <MapPinIcon size={14} />
                  <Text style={styles.mapButtonText}>Ver en mapa</Text>
                </Pressable>
              </View>
            </View>
            {event.meetingPoint && (
              <>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Punto de encuentro</Text>
                  <Text style={styles.infoValue}>{event.meetingPoint}</Text>
                </View>
              </>
            )}
          </GlassCard>

          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.description}>{event.description}</Text>

          {event.whatIncludes && (
            <>
              <Text style={styles.sectionTitle}>Qué incluye</Text>
              <View style={{ gap: 6 }}>
                {event.whatIncludes.map((item) => (
                  <Text key={item} style={styles.includesItem}>
                    · {item}
                  </Text>
                ))}
              </View>
            </>
          )}

          {!event.sourceCurated && (event.ratingCount > 0 || canReview) && (
            <>
              <View style={styles.reviewsHead}>
                <Text style={styles.sectionTitle}>Reseñas</Text>
                {event.ratingCount > 0 && (
                  <View style={styles.ratingRow}>
                    <Text style={styles.ratingText}>{formatRating(event.ratingAvg, event.ratingCount)}</Text>
                  </View>
                )}
              </View>
              {canReview && (
                <Pressable style={styles.reviewCta} onPress={() => router.push(`/resena/${event.id}`)}>
                  <Text style={styles.reviewCtaText}>Calificar este evento</Text>
                </Pressable>
              )}
              {reviews.slice(0, 5).map((r) => (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={styles.reviewTop}>
                    <Text style={styles.reviewAuthor}>{r.authorName}</Text>
                    <Text style={styles.reviewStars}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</Text>
                  </View>
                  {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
                  {r.reply && (
                    <Text style={styles.reviewReply}>
                      <Text style={{ fontFamily: fontFamily.bold, color: color.text2 }}>Respuesta del organizador: </Text>
                      {r.reply}
                    </Text>
                  )}
                </View>
              ))}
            </>
          )}

          {!event.sourceCurated && (
            <>
              <Text style={styles.sectionTitle}>Políticas</Text>
              <Text style={styles.description}>
                {REFUND_LABEL[event.refundPolicy]}
                {event.minAge ? ` · Solo mayores de ${event.minAge} años` : ""}
              </Text>
            </>
          )}

          {event.sourceCurated ? (
            <View style={styles.curatedBox}>
              <Text style={styles.curatedText}>Este evento todavía no se vende en Plann.</Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <GhostPillButton
                  label="Escribir por WhatsApp"
                  onPress={() => Alert.alert("WhatsApp", "Esto abriría el WhatsApp del organizador.")}
                />
              </View>
              <Pressable
                style={{ marginTop: 14 }}
                onPress={() => Alert.alert("¿Es tu evento?", "Esto llevaría al registro de organizador con este evento cargado.")}
              >
                <Text style={styles.claimLink}>¿Es tu evento? Reclámalo</Text>
              </Pressable>
            </View>
          ) : (
            ticketType && (
              <>
                <Text style={styles.sectionTitle}>Tickets</Text>
                {event.ticketTypes.length > 1 && (
                  <View style={{ gap: 8, marginBottom: 10 }}>
                    {event.ticketTypes.map((t) => {
                      const st = saleState(t);
                      const left = remaining(t);
                      const selected = t.id === ticketType.id;
                      return (
                        <Pressable
                          key={t.id}
                          disabled={st !== "on_sale"}
                          onPress={() => {
                            setSelectedTypeId(t.id);
                            setQuantity((q) => Math.max(t.minPerOrder, Math.min(q, t.maxPerOrder, left)));
                          }}
                          style={[styles.typeOption, selected && styles.typeOptionSelected, st !== "on_sale" && { opacity: 0.5 }]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.ticketName}>{t.name}</Text>
                            {st === "upcoming" && t.salesStart && <Text style={styles.ticketAvailability}>Abre el {formatShortDate(t.salesStart)}</Text>}
                            {st === "on_sale" && t.salesEnd && <Text style={styles.ticketAvailability}>Hasta el {formatShortDate(t.salesEnd)}</Text>}
                          </View>
                          <Text style={styles.ticketAvailability}>
                            {st === "ended" ? "Terminó" : st === "sold_out" ? "Agotado" : t.priceCents === 0 ? "Gratis" : formatUsd(t.priceCents)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                <GlassCard level="field" style={styles.ticketSelector}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ticketName}>{ticketType.name}</Text>
                    <Text style={styles.ticketAvailability}>
                      {state === "upcoming" && ticketType.salesStart
                        ? `Abre el ${formatShortDate(ticketType.salesStart)}`
                        : state === "ended"
                          ? "La venta terminó"
                          : ticketType.priceCents === 0
                            ? `Gratis · Quedan ${available}`
                            : `${formatUsd(ticketType.priceCents)} · Quedan ${available}`}
                    </Text>
                  </View>
                  <View style={styles.stepper}>
                    <Pressable
                      style={styles.stepperBtn}
                      onPress={() => setQuantity((q) => Math.max(ticketType.minPerOrder, q - 1))}
                    >
                      <Text style={styles.stepperBtnText}>−</Text>
                    </Pressable>
                    <Text style={styles.stepperValue}>{quantity}</Text>
                    <Pressable
                      style={styles.stepperBtn}
                      onPress={() => setQuantity((q) => Math.min(ticketType.maxPerOrder, available, q + 1))}
                    >
                      <Text style={styles.stepperBtnText}>+</Text>
                    </Pressable>
                  </View>
                </GlassCard>
              </>
            )
          )}
        </View>
      </ScrollView>

      {!event.sourceCurated && ticketType && totals && (
        <GlassCard level="bar" style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]}>
          <View style={styles.bottomBarInner}>
            <View>
              <Text style={styles.bottomPrice}>{ticketType.priceCents === 0 ? "Gratis" : formatUsd(totals.totalCents)}</Text>
              {ticketType.priceCents !== 0 && <Text style={styles.bottomPriceBs}>≈ {formatBs(totals.totalBs)} · tasa de hoy</Text>}
            </View>
            <PrimaryButton
              label={
                event.status === "cancelled"
                  ? "Cancelado"
                  : finished
                    ? "Evento finalizado"
                  : event.salesPaused
                    ? "Ventas pausadas"
                    : state === "upcoming"
                      ? "Aún no abre"
                      : state === "ended"
                        ? "Venta terminada"
                        : available <= 0
                          ? "Agotado"
                          : actionLabel
              }
              disabled={available <= 0 || event.salesPaused || event.status === "cancelled" || finished}
              onPress={() =>
                router.push(`/checkout/${event.id}?ticketTypeId=${ticketType.id}&quantity=${quantity}`)
              }
            />
          </View>
        </GlassCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  typeOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  typeOptionSelected: {
    borderColor: color.pink,
    backgroundColor: "rgba(233,65,127,0.10)",
  },
  gallery: {
    height: 260,
  },
  dots: { position: "absolute", bottom: 12, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.45)" },
  dotActive: { width: 18, backgroundColor: color.white },
  galleryTop: {
    position: "absolute",
    left: spacing.screenX,
    right: spacing.screenX,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: spacing.screenX,
    paddingTop: 18,
  },
  eyebrow: {
    fontFamily: fontFamily.extraBold,
    fontSize: 11,
    color: color.pink,
    letterSpacing: 0.55,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: {
    fontFamily: fontFamily.extraBold,
    fontSize: 25,
    letterSpacing: -0.5,
    color: color.text,
    marginBottom: 10,
  },
  followBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: color.pink, backgroundColor: color.pink },
  followBtnOn: { backgroundColor: "transparent" },
  followText: { fontFamily: fontFamily.bold, fontSize: 12, color: color.white },
  reviewsHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reviewCta: { alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: color.pink, marginBottom: 12 },
  reviewCtaText: { fontFamily: fontFamily.bold, fontSize: 13, color: color.white },
  reviewCard: { padding: 14, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", gap: 6, marginBottom: 10 },
  reviewTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reviewAuthor: { fontFamily: fontFamily.bold, fontSize: 13.5, color: color.text },
  reviewStars: { fontFamily: fontFamily.bold, fontSize: 13, color: color.pink },
  reviewComment: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 20, color: color.text2 },
  reviewReply: { fontFamily: fontFamily.regular, fontSize: 12.5, lineHeight: 18, color: color.text3, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: color.pink },
  organizerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  organizerName: {
    fontFamily: fontFamily.bold,
    fontSize: 13.5,
    color: color.text2,
  },
  verifiedBadge: {
    fontFamily: fontFamily.extraBold,
    fontSize: 10,
    color: color.pink,
    borderWidth: 1,
    borderColor: color.pink,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    overflow: "hidden",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12.5,
    color: color.text3,
  },
  infoCard: {
    marginBottom: 18,
  },
  infoRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: color.text4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  infoValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: color.text,
  },
  infoDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 14,
  },
  lugarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(233,65,127,0.4)",
  },
  mapButtonText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: color.pink,
  },
  sectionTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
    color: color.text,
    marginBottom: 8,
    marginTop: 6,
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 21.7,
    color: color.text2,
    marginBottom: 18,
  },
  includesItem: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: color.text2,
  },
  curatedBox: {
    marginTop: 10,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  curatedText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13.5,
    color: color.text2,
  },
  claimLink: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: color.pink,
    textAlign: "center",
  },
  ticketSelector: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 30,
    gap: 10,
  },
  ticketName: {
    fontFamily: fontFamily.bold,
    fontSize: 14.5,
    color: color.text,
  },
  ticketAvailability: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12.5,
    color: color.text3,
    marginTop: 2,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnText: {
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
    color: color.text,
  },
  stepperValue: {
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
    color: color.text,
    minWidth: 16,
    textAlign: "center",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 14,
  },
  bottomBarInner: {
    paddingHorizontal: spacing.screenX,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bottomPrice: {
    fontFamily: fontFamily.extraBold,
    fontSize: 20,
    color: color.text,
  },
  bottomPriceBs: {
    fontFamily: fontFamily.medium,
    fontSize: 11.5,
    color: color.text3,
  },
});
