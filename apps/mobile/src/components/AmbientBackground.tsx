import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, Rect, RadialGradient, Stop } from "react-native-svg";
import { color } from "../theme/tokens";

// Halo ambiental de la identidad: dos radiales rosa muy sutiles sobre el fondo #0B0B0A.
export function AmbientBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="haloTop" cx="50%" cy="-8%" rx="90%" ry="45%">
            <Stop offset="0%" stopColor={color.pink} stopOpacity={0.15} />
            <Stop offset="62%" stopColor={color.pink} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="haloBottom" cx="108%" cy="104%" rx="70%" ry="35%">
            <Stop offset="0%" stopColor={color.pink} stopOpacity={0.085} />
            <Stop offset="70%" stopColor={color.pink} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={color.bg} />
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#haloTop)" />
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#haloBottom)" />
      </Svg>
    </View>
  );
}
