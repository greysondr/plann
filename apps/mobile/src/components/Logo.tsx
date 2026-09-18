import React from "react";
import { Text, View } from "react-native";
import { color, fontFamily } from "../theme/tokens";
import { PinLogo } from "./PinLogo";

export function Logo({ pinSize = 19, wordmarkSize = 21 }: { pinSize?: number; wordmarkSize?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View
        style={{
          shadowColor: color.pink,
          shadowOpacity: 0.6,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 0 },
        }}
      >
        <PinLogo size={pinSize} />
      </View>
      <Text
        style={{
          fontFamily: fontFamily.display,
          fontSize: wordmarkSize,
          color: color.text,
          textShadowColor: "rgba(233,65,127,0.55)",
          textShadowRadius: 16,
          textShadowOffset: { width: 0, height: 0 },
        }}
      >
        Plann
      </Text>
    </View>
  );
}
