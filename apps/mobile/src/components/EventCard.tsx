import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { color, fontFamily, radius, spacing } from "../theme/tokens";
import { formatDuration, formatRating, formatShortDate } from "../utils/format";
import { EventImage } from "./EventImage";
import { GhostPillButton } from "./Button";
import { MapPinIcon } from "./icons";
import { openInMaps } from "../utils/maps";
import type { EventItem } from "../core/types";

function kindLabel(kind: EventItem["kind"]): string {
  switch (kind) {
    case "tour":
      return "Tour";
    case "experience":
      return "Experiencia";
    case "booking":
      return "Reserva";
    default:
      return "Evento";
  }
}

export function priceFrom(event: EventItem): string {
  if (event.isFree || event.ticketTypes.every((t) => t.priceCents === 0)) return "Gratis";
  const prices = event.ticketTypes.map((t) => t.priceCents).filter((p) => p > 0);
  if (!prices.length) return "—";
  const min = Math.min(...prices);
  return `desde $${(min / 100).toFixed(2)}`;
}

export function EventListCard({ event }: { event: EventItem }) {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push(`/evento/${event.id}`)} style={styles.listWrap}>
      <EventImage uri={event.imageUrl} label={event.imageLabel} style={styles.listThumb} />
      <View style={styles.listInfo}>
        <Text style={styles.eyebrow} numberOfLines={1}>
          {event.sourceCurated ? "Información" : `${kindLabel(event.kind)} · ${formatShortDate(event.startsAt)}`}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <View style={styles.bottomRow}>
          <Text style={styles.meta} numberOfLines={1}>
            {event.sourceCurated ? event.city : formatRating(event.ratingAvg, event.ratingCount)}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              hitSlop={8}
              style={styles.mapChip}
              onPress={(e) => {
                e.stopPropagation?.();
                openInMaps(event.lat, event.lng, event.venueName);
              }}
            >
              <MapPinIcon size={13} />
            </Pressable>
            <Text style={styles.price}>{event.sourceCurated ? "" : priceFrom(event)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function EventHeroCard({ event }: { event: EventItem }) {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push(`/evento/${event.id}`)} style={styles.heroWrap}>
      <EventImage uri={event.imageUrl} label={event.imageLabel} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={["rgba(11,11,10,0)", "rgba(11,11,10,0.88)"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0.35 }}
        end={{ x: 0, y: 1 }}
      />
      <View style={styles.heroBadge}>
        <Text style={styles.heroBadgeText}>{event.sourceCurated ? "Información" : event.isFeatured ? "Destacado" : kindLabel(event.kind)}</Text>
      </View>
      <View style={styles.heroBottom}>
        <Text style={styles.heroTitle} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={styles.heroMeta} numberOfLines={1}>
          {formatShortDate(event.startsAt)} · {formatDuration(event.durationMinutes)} · {event.city}
        </Text>
        <View style={styles.heroFooter}>
          <Text style={styles.heroPrice}>{event.sourceCurated ? "" : priceFrom(event)}</Text>
          <GhostPillButton label={event.sourceCurated ? "Ver más" : "Ver evento"} onPress={() => router.push(`/evento/${event.id}`)} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listWrap: {
    flexDirection: "row",
    gap: 10,
    padding: spacing.cardPadding,
    borderRadius: radius.card,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  listThumb: {
    width: 84,
    height: 84,
    borderRadius: radius.thumbnail,
  },
  listInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  eyebrow: {
    fontFamily: fontFamily.extraBold,
    fontSize: 10.5,
    color: color.pink,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: color.text,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  mapChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(233,65,127,0.35)",
  },
  meta: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: color.text3,
    flexShrink: 1,
  },
  price: {
    fontFamily: fontFamily.extraBold,
    fontSize: 15,
    color: color.text,
  },
  heroWrap: {
    width: 300,
    height: 212,
    borderRadius: radius.cardLarge,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  heroBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: color.pink,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  heroBadgeText: {
    fontFamily: fontFamily.extraBold,
    fontSize: 10,
    color: color.white,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  heroBottom: {
    padding: 16,
    gap: 4,
  },
  heroTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 21,
    letterSpacing: -0.3,
    color: color.text,
  },
  heroMeta: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12.5,
    color: color.text2,
  },
  heroFooter: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroPrice: {
    fontFamily: fontFamily.extraBold,
    fontSize: 17,
    color: color.text,
  },
});
