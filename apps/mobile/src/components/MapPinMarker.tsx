import React from "react";
import { StyleSheet, View } from "react-native";
import { color } from "../theme/tokens";

// Pin del mapa (sección 5.3 / 2 de la identidad): rosa con glow, nunca cambia
// de color ni se rota.
export function MapPinMarker({ active }: { active?: boolean }) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.pin, active && styles.pinActive]}>
        <View style={styles.dot} />
      </View>
      <View style={styles.tail} />
    </View>
  );
}

const SIZE = 30;

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    width: SIZE + 16,
  },
  pin: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: color.pink,
    borderWidth: 2,
    borderColor: color.cream,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: color.pink,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  pinActive: {
    transform: [{ scale: 1.15 }],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.cream,
  },
  tail: {
    width: 2,
    height: 8,
    backgroundColor: color.pink,
    marginTop: -1,
  },
});
