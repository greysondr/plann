import React, { useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, type MapPressEvent } from "react-native-maps";
import { MapPinMarker } from "./MapPinMarker";
import { color, fontFamily, radius } from "../theme/tokens";

export interface LatLng {
  lat: number;
  lng: number;
}

const BARQUISIMETO: LatLng = { lat: 10.0678, lng: -69.3467 };

// Mapa para marcar dónde es el evento: se toca un punto y el pin se mueve ahí.
// Sin punto elegido arranca centrado en Barquisimeto.
export function LocationPicker({ value, onChange }: { value: LatLng | null; onChange: (point: LatLng) => void }) {
  const mapRef = useRef<MapView>(null);
  const center = value ?? BARQUISIMETO;

  function handlePress(e: MapPressEvent) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    onChange({ lat: latitude, lng: longitude });
  }

  return (
    <View>
      <View style={styles.mapBox}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.06, longitudeDelta: 0.06 }}
          onPress={handlePress}
          showsCompass={false}
          toolbarEnabled={false}
          pitchEnabled={false}
        >
          {value && (
            <Marker coordinate={{ latitude: value.lat, longitude: value.lng }} tracksViewChanges={false} draggable onDragEnd={(e) => onChange({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}>
              <MapPinMarker active />
            </Marker>
          )}
        </MapView>
      </View>
      <Text style={styles.hint}>{value ? "Toca otro punto del mapa o arrastra el pin para moverlo." : "Toca el mapa para marcar dónde es tu evento."}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mapBox: { height: 200, borderRadius: radius.cardLarge, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  hint: { fontFamily: fontFamily.regular, fontSize: 12.5, color: color.text3, marginTop: 8 },
});
