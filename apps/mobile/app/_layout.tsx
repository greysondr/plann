import { DarkTheme, Stack, ThemeProvider, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Font from "expo-font";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import { AmbientBackground } from "../src/components/AmbientBackground";
import { AppStoreProvider, useAppStore } from "../src/context/AppStore";
import { color } from "../src/theme/tokens";

// Sin sesión -> manda a /auth/login; ninguna otra pantalla es alcanzable sin
// haber iniciado sesión (mismo patrón que useOrganizerGuard para organizador).
function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, isSignedIn } = useAppStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "auth";
    if (!isSignedIn && !inAuthGroup) {
      router.replace("/auth/login");
    } else if (isSignedIn && inAuthGroup) {
      router.replace("/");
    }
  }, [loading, isSignedIn, segments, router]);

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: color.bg }} />;
  }
  return <>{children}</>;
}

const plannNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "transparent",
    card: "transparent",
    text: color.text,
    border: "transparent",
    primary: color.pink,
  },
};

export default function RootLayout() {
  const [manropeLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const [newakeLoaded, setNewakeLoaded] = useState(false);

  useEffect(() => {
    Font.loadAsync({ Newake: require("../assets/fonts/NewakeFont-Demo.otf") })
      .then(() => setNewakeLoaded(true))
      .catch(() => setNewakeLoaded(true));
  }, []);

  if (!manropeLoaded || !newakeLoaded) {
    return <View style={{ flex: 1, backgroundColor: color.bg }} />;
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <AmbientBackground />
        <StatusBar style="light" />
        <AppStoreProvider>
          <ThemeProvider value={plannNavigationTheme}>
            <AuthGate>
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}>
                <Stack.Screen name="auth/login" />
                <Stack.Screen name="auth/registro" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="evento/[id]" />
                <Stack.Screen name="checkout/[id]" options={{ presentation: "modal" }} />
                <Stack.Screen name="organizador/index" />
                <Stack.Screen name="organizador/activar" />
                <Stack.Screen name="organizador/crear" />
                <Stack.Screen name="organizador/escanear" />
                <Stack.Screen name="organizador/retiros" />
                <Stack.Screen name="organizador/equipo" />
                <Stack.Screen name="puerta" />
                <Stack.Screen name="organizador/editar/[id]" />
                <Stack.Screen name="organizador/asistentes/[id]" />
                <Stack.Screen name="perfil/nivel" />
                <Stack.Screen name="perfil/historial" />
              </Stack>
            </AuthGate>
          </ThemeProvider>
        </AppStoreProvider>
      </View>
    </SafeAreaProvider>
  );
}
