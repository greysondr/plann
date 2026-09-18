import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { color, fontFamily, radius } from "../theme/tokens";

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        selected
          ? styles.selected
          : styles.unselected,
      ]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: radius.pill,
    minHeight: 36,
    justifyContent: "center",
  },
  selected: {
    backgroundColor: color.pink,
    shadowColor: color.pink,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  unselected: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "transparent",
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: color.text2,
  },
  labelSelected: {
    fontFamily: fontFamily.bold,
    color: color.white,
  },
});
