// Envía una notificación de la tabla public.notifications como push de Expo a
// todos los dispositivos del usuario. La invoca el disparador dispatch_push()
// (vía pg_net) cuando se inserta una notificación, con { notification_id }.
//
// Configuración en producción (una vez, como service role):
//   insert into internal_config values
//     ('push_function_url', 'https://<proyecto>.supabase.co/functions/v1/send-push'),
//     ('push_function_key', '<service role key>');
import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req) => {
  let notificationId: string | undefined;
  try {
    ({ notification_id: notificationId } = await req.json());
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!notificationId) return Response.json({ error: "notification_id_required" }, { status: 400 });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: notification } = await supabase.from("notifications").select("*").eq("id", notificationId).maybeSingle();
  if (!notification) return Response.json({ error: "not_found" }, { status: 404 });

  const { data: tokens } = await supabase.from("push_tokens").select("token").eq("user_id", notification.user_id);
  if (!tokens || tokens.length === 0) return Response.json({ sent: 0 });

  const messages = tokens.map((t) => ({
    to: t.token,
    title: notification.title,
    body: notification.body,
    data: { ...notification.data, notification_id: notification.id },
    sound: "default",
  }));

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });
  const result = await response.json().catch(() => ({}));

  // Tokens que Expo ya no reconoce (app desinstalada): se borran para no reintentar.
  const tickets: { status: string; details?: { error?: string } }[] = result?.data ?? [];
  const dead = tokens.filter((_, i) => tickets[i]?.status === "error" && tickets[i]?.details?.error === "DeviceNotRegistered").map((t) => t.token);
  if (dead.length > 0) await supabase.from("push_tokens").delete().in("token", dead);

  return Response.json({ sent: tokens.length - dead.length, removed: dead.length });
});
