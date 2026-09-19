import React, { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { color, fontFamily, radius } from "../theme/tokens";

export const MAX_EVENT_PHOTOS = 5;

// Galería del evento: hasta 5 fotos 16:9. La primera es la portada (la de las tarjetas y Buscar);
// las demás se ven al deslizar en la página del evento. Las que ya son url se conservan;
// las nuevas (file://) se suben al guardar.
export function EventPhotosField({ photos, onChange }: { photos: string[]; onChange: (photos: string[]) => void }) {
  const [selected, setSelected] = useState(0);
  const current = Math.min(selected, Math.max(0, photos.length - 1));

  async function add() {
    if (photos.length >= MAX_EVENT_PHOTOS) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Necesitamos acceso a tus fotos", "Actívalo desde Ajustes para poder elegir una imagen.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [16, 9], quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      const next = [...photos, result.assets[0].uri];
      onChange(next);
      setSelected(next.length - 1);
    }
  }

  function remove() {
    const next = photos.filter((_, i) => i !== current);
    onChange(next);
    setSelected(0);
  }

  function makeCover() {
    const next = [photos[current], ...photos.filter((_, i) => i !== current)];
    onChange(next);
    setSelected(0);
  }

  const shown = photos[current];
  return (
    <View>
      <Pressable style={styles.box} onPress={photos.length === 0 ? add : undefined}>
        {shown ? (
          <>
            <Image source={{ uri: shown }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{current === 0 ? "Portada · así se ve en la app" : `Foto ${current + 1}`}</Text>
            </View>
          </>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderTitle}>Toca para elegir una foto</Text>
            <Text style={styles.placeholderHint}>Horizontal, 1600 × 900 px (16:9)</Text>
          </View>
        )}
      </Pressable>

      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
          {photos.map((uri, i) => (
            <Pressable key={`${uri}-${i}`} onPress={() => setSelected(i)} style={[styles.thumb, i === current && styles.thumbSelected]}>
              <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              {i === 0 && (
                <View style={styles.coverTag}>
                  <Text style={styles.coverTagText}>Portada</Text>
                </View>
              )}
            </Pressable>
          ))}
          {photos.length < MAX_EVENT_PHOTOS && (
            <Pressable onPress={add} style={[styles.thumb, styles.addThumb]}>
              <Text style={styles.addText}>+</Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      {photos.length > 0 && (
        <View style={styles.actions}>
          {current > 0 && (
            <Pressable onPress={makeCover}>
              <Text style={styles.link}>Hacer portada</Text>
            </Pressable>
          )}
          <Pressable onPress={remove}>
            <Text style={[styles.link, { color: color.text3 }]}>Quitar esta foto</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.hint}>
        Hasta {MAX_EVENT_PHOTOS} fotos horizontales de 1600 × 900 px o más (16:9). La portada es la primera y es la que ven en Buscar y en las tarjetas.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { aspectRatio: 16 / 9, borderRadius: radius.cardLarge, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.055)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  placeholderTitle: { fontFamily: fontFamily.bold, fontSize: 14, color: color.text2 },
  placeholderHint: { fontFamily: fontFamily.regular, fontSize: 12, color: color.text3 },
  badge: { position: "absolute", left: 10, bottom: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.55)" },
  badgeText: { fontFamily: fontFamily.semiBold, fontSize: 11, color: color.white },
  thumbs: { gap: 10, paddingTop: 12 },
  thumb: { width: 84, aspectRatio: 16 / 9, borderRadius: 12, overflow: "hidden", borderWidth: 2, borderColor: "transparent", backgroundColor: "rgba(255,255,255,0.06)" },
  thumbSelected: { borderColor: color.pink },
  addThumb: { alignItems: "center", justifyContent: "center", borderColor: "rgba(255,255,255,0.18)", borderStyle: "dashed" },
  addText: { fontFamily: fontFamily.bold, fontSize: 24, color: color.text2 },
  coverTag: { position: "absolute", left: 4, top: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: color.pink },
  coverTagText: { fontFamily: fontFamily.bold, fontSize: 9.5, color: color.white },
  actions: { flexDirection: "row", gap: 18, marginTop: 10 },
  link: { fontFamily: fontFamily.bold, fontSize: 13, color: color.pink },
  hint: { fontFamily: fontFamily.regular, fontSize: 12.5, lineHeight: 18, color: color.text3, marginTop: 8 },
});
