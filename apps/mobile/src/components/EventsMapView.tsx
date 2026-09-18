import React, { useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MapPinMarker } from "./MapPinMarker";
import { EventImage } from "./EventImage";
import { PrimaryButton } from "./Button";
import { priceFrom } from "./EventCard";
import { formatShortDate } from "../utils/format";
import { color, fontFamily, radius, spacing } from "../theme/tokens";
import type { EventItem } from "../core/types";

const BARQUISIMETO_REGION: Region = {
  latitude: 10.0,
  longitude: -69.42,
  latitudeDelta: 0.55,
  longitudeDelta: 0.55,
};

function regionForEvents(events: EventItem[]): Region {
  if (events.length === 0) return BARQUISIMETO_REGION;
  const lats = events.map((e) => e.lat);
  const lngs = events.map((e) => e.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLng + maxLng) / 2;
  const latitudeDelta = Math.max(0.18, (maxLat - minLat) * 1.6);
  const longitudeDelta = Math.max(0.18, (maxLng - minLng) * 1.6);
  return { latitude, longitude, latitudeDelta, longitudeDelta };
}

export function EventsMapView({ events }: { events: EventItem[] }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const initialRegion = useMemo(() => regionForEvents(events), []); // eslint-disable-line react-hooks/exhaustive-deps
  const selected = events.find((e) => e.id === selectedId) ?? null;

  return (
    <View style={styles.wrap}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onPress={() => setSelectedId(null)}
        showsUserLocation={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {events.map((event) => (
          <Marker
            key={event.id}
            coordinate={{ latitude: event.lat, longitude: event.lng }}
            onPress={(e) => {
              e.stopPropagation();
              setSelectedId(event.id);
            }}
            tracksViewChanges={false}
          >
            <MapPinMarker active={selectedId === event.id} />
          </Marker>
        ))}
      </MapView>

      {events.length === 0 && (
        <View pointerEvents="none" style={styles.emptyBanner}>
          <Text style={styles.emptyBannerText}>Nada por aquí con estos filtros</Text>
        </View>
      )}

      {selected && (
        <Pressable
          style={[styles.previewCard, { bottom: 100 + insets.bottom }]}
          onPress={() => router.push(`/evento/${selected.id}`)}
        >
          <EventImage uri={selected.imageUrl} label={selected.imageLabel} style={styles.previewImage} />
          <View style={styles.previewInfo}>
            <Text style={styles.previewEyebrow} numberOfLines={1}>
              {selected.sourceCurated ? "Información" : `${selected.category} · ${formatShortDate(selected.startsAt)}`}
            </Text>
            <Text style={styles.previewTitle} numberOfLines={2}>
              {selected.title}
            </Text>
            <Text style={styles.previewMeta} numberOfLines={1}>
              {selected.venueName}
            </Text>
          </View>
          <View style={styles.previewAction}>
            <Text style={styles.previewPrice}>{selected.sourceCurated ? "" : priceFrom(selected)}</Text>
            <PrimaryButton label="Ver" onPress={() => router.push(`/evento/${selected.id}`)} style={styles.previewButton} />
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    overflow: "hidden",
  },
  emptyBanner: {
    position: "absolute",
    top: 16,
    left: spacing.screenX,
    right: spacing.screenX,
    alignItems: "center",
    backgroundColor: "rgba(11,11,10,0.85)",
    borderRadius: radius.pill,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  emptyBannerText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12.5,
    color: color.text2,
  },
  previewCard: {
    position: "absolute",
    left: spacing.screenX,
    right: spacing.screenX,
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: radius.cardLarge,
    backgroundColor: "#141317",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    alignItems: "center",
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: radius.thumbnail,
  },
  previewInfo: {
    flex: 1,
    gap: 2,
  },
  previewEyebrow: {
    fontFamily: fontFamily.extraBold,
    fontSize: 9.5,
    color: color.pink,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  previewTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 13.5,
    color: color.text,
  },
  previewMeta: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: color.text3,
  },
  previewAction: {
    alignItems: "flex-end",
    gap: 6,
  },
  previewPrice: {
    fontFamily: fontFamily.extraBold,
    fontSize: 12.5,
    color: color.text,
  },
  previewButton: {
    minHeight: 34,
    paddingHorizontal: 16,
  },
});
