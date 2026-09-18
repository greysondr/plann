import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import { BlurView } from "expo-blur";
import { glass, radius } from "../theme/tokens";

type Level = "card" | "field" | "panel" | "bar" | "circleButton";

const LEVELS: Record<Level, { blur: number; radius: number }> = {
  card: { blur: 20, radius: radius.card },
  field: { blur: 20, radius: radius.field },
  panel: { blur: 25, radius: radius.cardLarge },
  bar: { blur: 28, radius: 0 },
  circleButton: { blur: 18, radius: radius.pill },
};

interface GlassCardProps extends ViewProps {
  level?: Level;
  radiusOverride?: number;
}

export function GlassCard({ level = "card", radiusOverride, style, children, ...rest }: GlassCardProps) {
  const cfg = LEVELS[level];
  const tokens = glass[level];
  const r = radiusOverride ?? cfg.radius;
  return (
    <View
      style={[
        styles.wrap,
        {
          borderRadius: r,
          borderColor: tokens.border,
        },
        style,
      ]}
      {...rest}
    >
      <BlurView intensity={cfg.blur} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.background, borderRadius: r }]} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
  },
  content: {
    flex: 1,
  },
});
