import React from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { color, fontFamily, radius } from "../theme/tokens";

// Foto del evento: recorte 16:9 (el mismo que usan la portada y las tarjetas)
// con vista previa. `uri` es la foto nueva elegida; `current` la que ya tiene.
export function EventPhotoField({ uri, current, onPick }: { uri: string | null; current?: string; onPick: (uri: string) => void }) {
  async function pick() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Necesitamos acceso a tus fotos", "Actívalo desde Ajustes para poder elegir una imagen.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [16, 9], quality: 0.85 });
    if (!result.canceled && result.assets[0]) onPick(result.assets[0].uri);
  }

  const shown = uri ?? current;
  return (
    <View>
      <Pressable style={styles.box} onPress={pick}>
        {shown ? (
          <>
            <Image source={{ uri: shown }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{uri ? "Foto nueva · así se ve en la app" : "Así se ve en la app"}</Text>
            </View>
          </>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderTitle}>Toca para elegir una foto</Text>
            <Text style={styles.placeholderHint}>Horizontal, 1600 × 900 px (16:9)</Text>
          </View>
        )}
      </Pressable>
      {shown && (
        <Pressable onPress={pick} style={{ marginTop: 10 }}>
          <Text style={styles.change}>Cambiar foto</Text>
        </Pressable>
      )}
      <Text style={styles.hint}>
        Recomendado: 1600 × 900 px o más, horizontal (16:9). Es el recorte que usan la portada y las tarjetas, así que lo que ves arriba es lo que verá la gente.
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
  change: { fontFamily: fontFamily.bold, fontSize: 13, color: color.pink },
  hint: { fontFamily: fontFamily.regular, fontSize: 12.5, lineHeight: 18, color: color.text3, marginTop: 8 },
});
