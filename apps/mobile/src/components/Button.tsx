import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { color, fontFamily, radius } from "../theme/tokens";

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.primary, (disabled || loading) && styles.disabled, style]}
    >
      {loading ? <ActivityIndicator color={color.white} /> : <Text style={styles.primaryLabel}>{label}</Text>}
    </Pressable>
  );
}

export function GhostPillButton({ label, onPress, style }: { label: string; onPress?: () => void; style?: ViewStyle }) {
  return (
    <Pressable onPress={onPress} style={[styles.ghost, style]}>
      <Text style={styles.ghostLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: color.pink,
    borderRadius: radius.pill,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    shadowColor: color.pink,
    shadowOpacity: 0.42,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  disabled: {
    opacity: 0.5,
  },
  primaryLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: color.white,
  },
  ghost: {
    borderRadius: radius.pill,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    backgroundColor: color.cream,
  },
  ghostLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: color.ink,
  },
});
