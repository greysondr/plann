import { Linking, Platform } from "react-native";

// Abre Google Maps (app si está instalada, si no el navegador) en la ubicación
// del evento. Sección 5.4: "lugar con mini-mapa y botón Cómo llegar".
export async function openInMaps(lat: number, lng: number, label: string) {
  const encodedLabel = encodeURIComponent(label);
  const googleUrl =
    Platform.OS === "ios"
      ? `comgooglemaps://?q=${encodedLabel}&center=${lat},${lng}&zoom=15`
      : `geo:${lat},${lng}?q=${lat},${lng}(${encodedLabel})`;
  const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  try {
    const canOpenNative = await Linking.canOpenURL(googleUrl);
    await Linking.openURL(canOpenNative ? googleUrl : webUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
}
