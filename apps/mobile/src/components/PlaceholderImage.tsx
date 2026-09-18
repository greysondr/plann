import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import Svg, { Defs, Pattern, Path, Rect } from "react-native-svg";
import { color, fontFamily } from "../theme/tokens";

// Placeholder de rayas diagonales para fotos faltantes, con etiqueta describiendo la foto
// en una esquina libre, tal como pide la identidad visual (nunca centrada).
export function PlaceholderImage({ label, style }: { label: string; style?: ViewStyle }) {
  return (
    <View style={[styles.wrap, style]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id="stripes" width={18} height={18} patternUnits="userSpaceOnUse" patternTransform="rotate(135)">
            <Rect width={18} height={18} fill="rgba(255,255,255,0.025)" />
            <Path d="M0 0 L9 0 L9 18 L0 18 Z" fill="rgba(255,255,255,0.075)" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#stripes)" />
      </Svg>
      <View style={styles.labelWrap}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: color.bgCanvas,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  labelWrap: {
    position: "absolute",
    right: 8,
    bottom: 8,
    maxWidth: "70%",
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: color.text4,
    letterSpacing: 0.2,
  },
});
