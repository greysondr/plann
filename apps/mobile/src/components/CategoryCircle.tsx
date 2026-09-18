import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { color, fontFamily } from "../theme/tokens";

const SIZE = 64;

// Categoría como círculo con foto, en scroll horizontal — compacto, no le
// gana espacio a la pantalla como las tarjetas grandes que probamos antes.
// Si la foto falla, cae a un círculo con la inicial (nunca texto largo
// apretado en un espacio tan chico).
export function CategoryCircle({
  label,
  imageUrl,
  selected,
  onPress,
}: {
  label: string;
  imageUrl?: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = imageUrl && !failed;

  return (
    <Pressable onPress={onPress} style={styles.wrap}>
      <View style={[styles.ring, selected && styles.ringSelected]}>
        {showImage ? (
          <Image source={{ uri: imageUrl }} style={styles.circle} onError={() => setFailed(true)} />
        ) : (
          <View style={[styles.circle, styles.fallback]}>
            <Text style={styles.fallbackLetter}>{label.charAt(0)}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 76,
    alignItems: "center",
    gap: 6,
  },
  ring: {
    width: SIZE + 6,
    height: SIZE + 6,
    borderRadius: (SIZE + 6) / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  ringSelected: {
    borderColor: color.pink,
    shadowColor: color.pink,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
  },
  fallback: {
    backgroundColor: color.bgCanvas,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackLetter: {
    fontFamily: fontFamily.extraBold,
    fontSize: 22,
    color: color.text3,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11.5,
    color: color.text2,
    textAlign: "center",
  },
  labelSelected: {
    fontFamily: fontFamily.bold,
    color: color.pink,
  },
});
