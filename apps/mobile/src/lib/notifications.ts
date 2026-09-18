import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

// "Recordar evento" (sección 5.3): un aviso local 2 horas antes de que
// empiece. No depende de un servidor de push — se agenda en el propio
// teléfono al activar el recordatorio, y se cancela si se desactiva.
const SCHEDULED_KEY = "plann.reminder-notifications.v1";
const HOURS_BEFORE = 2;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
