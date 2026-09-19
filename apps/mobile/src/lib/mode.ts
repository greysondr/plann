import AsyncStorage from "@react-native-async-storage/async-storage";

// Recuerda el último modo usado para que un organizador vuelva a abrir la app
// directo en su panel, sin tener que buscarlo cada vez.
const KEY = "plann.last-mode.v1";
export type AppMode = "buyer" | "organizer";

export async function getLastMode(): Promise<AppMode> {
  try {
    return (await AsyncStorage.getItem(KEY)) === "organizer" ? "organizer" : "buyer";
  } catch {
    return "buyer";
  }
}

export async function setLastMode(mode: AppMode): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, mode);
  } catch {
    // preferencia opcional
  }
}
