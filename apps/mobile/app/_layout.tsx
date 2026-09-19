import { DarkTheme, Stack, ThemeProvider, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Font from "expo-font";
import { useEffect, useRef, useState } from "react";
import * as Notifications from "expo-notifications";
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
import { getLastMode } from "../src/lib/mode";

// Sin sesión -> manda a /auth/login; ninguna otra pantalla es alcanzable sin
// haber iniciado sesión (mismo patrón que useOrganizerGuard para organizador).
function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, isSignedIn, organizerStatus } = useAppStore();
  const segments = useSegments();
  const router = useRouter();
  const restored = useRef(false);

  // Tocar un aviso (con la app abierta, en segundo plano o cerrada) abre la
  // pantalla que trae en data.route.
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledResponse = useRef<string | null>(null);
  useEffect(() => {
    if (loading || !isSignedIn || !lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    if (handledResponse.current === id) return;
    handledResponse.current = id;
    const route = lastResponse.notification.request.content.data?.route;
    if (typeof route === "string" && route.startsWith("/")) router.push(route as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isSignedIn, lastResponse]);

  // Un organizador que cerró la app en su panel la vuelve a abrir ahí. Solo al
  // arrancar y solo si cae en el inicio: un enlace profundo no se pisa.
  useEffect(() => {
    if (loading || !isSignedIn || restored.current) return;
    restored.current = true;
    if (organizerStatus !== "verified") return;
    const parts = segments as string[];
    const atBuyerHome = parts[0] === "(tabs)" && parts.length <= 2 && (!parts[1] || parts[1] === "index");
    if (!atBuyerHome) return;
    getLastMode().then((mode) => {
      if (mode === "organizer") router.replace("/organizador");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isSignedIn, organizerStatus]);

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
                <Stack.Screen name="organizador/(panel)" />
                <Stack.Screen name="organizador/activar" />
                <Stack.Screen name="organizador/crear" />
                <Stack.Screen name="organizador/escanear" />
                <Stack.Screen name="organizador/retiros" />
                <Stack.Screen name="organizador/cupones" />
                <Stack.Screen name="organizador/resenas" />
                <Stack.Screen name="resena/[id]" />
                <Stack.Screen name="organizador/comparar" />
                <Stack.Screen name="organizador/reportes" />
                <Stack.Screen name="organizador/negocio" />
                <Stack.Screen name="organizador/analiticas/[id]" />
                <Stack.Screen name="organizador/equipo" />
                <Stack.Screen name="organizador/ofertas/[id]" />
                <Stack.Screen name="puerta" />
                <Stack.Screen name="organizador/editar/[id]" />
                <Stack.Screen name="organizador/asistentes/[id]" />
                <Stack.Screen name="notificaciones" />
                <Stack.Screen name="regalar/[ticketId]" />
                <Stack.Screen name="soporte/index" />
                <Stack.Screen name="soporte/[id]" />
                <Stack.Screen name="perfil/nivel" />
                <Stack.Screen name="perfil/historial" />
                <Stack.Screen name="perfil/cumpleanos" />
              </Stack>
            </AuthGate>
          </ThemeProvider>
        </AppStoreProvider>
      </View>
    </SafeAreaProvider>
  );
}
