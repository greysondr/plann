import React, { useState } from "react";
import { ActivityIndicator, Image, StyleSheet, View, ViewStyle } from "react-native";
import { PlaceholderImage } from "./PlaceholderImage";
import { color } from "../theme/tokens";

// Foto real del evento, con reserva automática al placeholder de rayas si la
// URL falla (sin internet, imagen caída, etc.) — nunca una pantalla rota.
export function EventImage({ uri, label, style }: { uri?: string; label: string; style?: ViewStyle }) {
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  if (!uri || failed) {
    return <PlaceholderImage label={label} style={style} />;
  }

  return (
    <View style={[styles.wrap, style]}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        onError={() => setFailed(true)}
        onLoadEnd={() => setLoading(false)}
      />
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.loading]}>
          <ActivityIndicator color={color.text3} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: color.bgCanvas,
    overflow: "hidden",
  },
  loading: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.bgCanvas,
  },
});
