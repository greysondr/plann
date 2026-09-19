import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

// "Recordar evento" (sección 5.3): un aviso local 2 horas antes de que
// empiece. No depende de un servidor de push — se agenda en el propio
// teléfono al activar el recordatorio, y se cancela si se desactiva.
const SCHEDULED_KEY = "plann.reminder-notifications.v1";
const HOURS_BEFORE = 2;

// Con la app abierta, el aviso ya lo muestra la suscripción en tiempo real
// (presentLocalNotification): un push remoto que llegue a la vez se silencia
// para no duplicar el banner.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isRemotePush = (notification.request.trigger as { type?: string } | null)?.type === "push";
    const silence = isRemotePush && AppState.currentState === "active";
    return {
      shouldPlaySound: !silence,
      shouldSetBadge: false,
      shouldShowBanner: !silence,
      shouldShowList: !silence,
    };
  },
});

export async function presentLocalNotification(n: { title: string; body: string; data?: Record<string, unknown> }): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;
  await Notifications.scheduleNotificationAsync({
    content: { title: n.title, body: n.body, data: n.data ?? {}, sound: true },
    trigger: null,
  }).catch(() => {});
}

// Guarda el token de push de este teléfono para que el servidor pueda avisarle
// aunque la app esté cerrada. Falla en silencio donde no hay push (simulador,
// permiso denegado, app sin projectId de EAS todavía).
export async function registerPushToken(userId: string): Promise<void> {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await supabase
      .from("push_tokens")
      .upsert({ user_id: userId, token, platform: Platform.OS, updated_at: new Date().toISOString() }, { onConflict: "token" });
  } catch {
    // sin push en este dispositivo
  }
}

async function getMap(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(SCHEDULED_KEY);
  return raw ? JSON.parse(raw) : {};
}

async function setMap(map: Record<string, string>): Promise<void> {
  await AsyncStorage.setItem(SCHEDULED_KEY, JSON.stringify(map));
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleEventReminder(event: { id: string; title: string; startsAt: string }): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  const triggerDate = new Date(new Date(event.startsAt).getTime() - HOURS_BEFORE * 60 * 60 * 1000);
  if (triggerDate.getTime() <= Date.now()) return; // ya no tiene sentido agendarlo

  await cancelEventReminder(event.id);

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Tu plan empieza pronto",
      body: `${event.title} empieza en ${HOURS_BEFORE} horas.`,
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });

  const map = await getMap();
  map[event.id] = notificationId;
  await setMap(map);
}

export async function cancelEventReminder(eventId: string): Promise<void> {
  const map = await getMap();
  const notificationId = map[eventId];
  if (!notificationId) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {});
  delete map[eventId];
  await setMap(map);
}
