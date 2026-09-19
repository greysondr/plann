"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { requireOrganizer } from "@/lib/org/session";
import type { FormState } from "@/app/organizador/actions";
import { dayEndIso, dayStartIso } from "@/lib/format";

const DB_ERRORS: Record<string, string> = {
  insufficient_balance: "No tienes saldo suficiente para ese monto.",
  below_minimum: "El retiro mínimo es de $5,00.",
  account_required: "Escribe los datos de la cuenta donde quieres recibir el pago.",
  organizer_not_verified: "Tu cuenta de organizador todavía no está verificada.",
  quantity_below_sold: "El cupo no puede ser menor a lo que ya se vendió o está reservado.",
  event_closed: "Este evento ya está cerrado y no se puede modificar.",
  reason_required: "Cuéntales a tus compradores por qué se cancela (mínimo 5 letras).",
  user_not_found: "No hay ninguna cuenta de Plann con ese correo. Pídele que se registre primero.",
  cannot_add_self: "Ya eres el dueño, no hace falta agregarte.",
  not_authorized: "No tienes permiso para hacer esto.",
  sold_out: "No quedan entradas suficientes de ese tipo.",
  staff_limit_reached: "Llegaste al máximo de personas de tu plan (Básico 1, Pro 5, Business 50).",
  invalid_role: "Elige un rol válido.",
  support_text_short: "Cuéntanos un poco más: el asunto y el mensaje son muy cortos.",
  support_too_many_open: "Ya tienes 5 consultas abiertas. Espera a que respondamos alguna.",
  ticket_closed: "Esta consulta está cerrada. Abre una nueva si sigues con el problema.",
  order_not_refundable: "Esta compra ya no se puede reembolsar.",
  tickets_used: "Alguien ya entró con estas entradas: no se puede reembolsar.",
  comp_no_refund: "Las cortesías no se reembolsan.",
  ticket_sales_window_valid: "La fecha de cierre debe ser posterior a la de apertura.",
  message_length: "El mensaje debe tener entre 5 y 500 caracteres.",
  announcement_limit: "Ya enviaste 3 mensajes a este evento hoy. Intenta mañana.",
};

function dbError(message: string | undefined, fallback: string): string {
  if (!message) return fallback;
  const key = Object.keys(DB_ERRORS).find((k) => message.includes(k));
  return key ? DB_ERRORS[key] : fallback;
}

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "evento"
  );
}

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

async function uploadImage(file: File, organizerId: string, prefix = ""): Promise<{ url?: string; error?: string }> {
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { error: "La foto debe ser JPG, PNG o WebP." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "La foto pesa más de 5 MB. Usa una más liviana." };
  const supabase = await supabaseServer();
  const path = `${organizerId}/${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from("event-images").upload(path, file, { contentType: file.type });
  if (error) return { error: "No pudimos subir la foto. Intenta de nuevo." };
  return { url: supabase.storage.from("event-images").getPublicUrl(path).data.publicUrl };
}

const MAX_PHOTOS = 5;

// Fotos finales del evento: las ya guardadas que se conservan (en el orden elegido) + las nuevas subidas.
async function collectImages(formData: FormData, organizerId: string, fallback: string[] = []): Promise<{ urls?: string[]; error?: string }> {
  let kept: string[] = fallback;
  const rawExisting = formData.get("existing_images");
  if (typeof rawExisting === "string") {
    try {
      const parsed = JSON.parse(rawExisting);
      if (Array.isArray(parsed)) kept = parsed.filter((u): u is string => typeof u === "string" && u.startsWith("http"));
    } catch {
      // se conserva el fallback
    }
  }
  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (kept.length + files.length > MAX_PHOTOS) return { error: `Máximo ${MAX_PHOTOS} fotos por evento.` };
  const uploaded: string[] = [];
  for (const file of files) {
    const r = await uploadImage(file, organizerId);
    if (r.error) return { error: r.error };
    if (r.url) uploaded.push(r.url);
  }
  return { urls: [...kept, ...uploaded] };
}

// datetime-local (sin zona) -> ISO en hora de Venezuela; vacío = null.
function parsePublishAt(value: FormDataEntryValue | null): string | null | "invalid" {
  const s = String(value ?? "");
  if (!s) return null;
  const iso = parseVeDate(value);
  if (!iso) return "invalid";
  return iso;
}

export interface TicketInput {
  id?: string;
  name: string;
  priceCents: number;
  quantity: number;
  salesStart: string | null;
  salesEnd: string | null;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
function parseWindow(startDay: unknown, endDay: unknown): { start: string | null; end: string | null } | string {
  const s = String(startDay ?? "");
  const e = String(endDay ?? "");
  if ((s && !DAY_RE.test(s)) || (e && !DAY_RE.test(e))) return "Revisa las fechas de venta.";
  if (s && e && e < s) return "La venta debe cerrar después de abrir.";
  return { start: s ? dayStartIso(s) : null, end: e ? dayEndIso(e) : null };
}

function parseTickets(raw: FormDataEntryValue | null): TicketInput[] | string {
  let list: unknown;
  try {
    list = JSON.parse(String(raw ?? "[]"));
  } catch {
    return "Revisa las entradas.";
  }
  if (!Array.isArray(list) || list.length === 0) return "Agrega al menos un tipo de entrada.";
  const out: TicketInput[] = [];
  for (const item of list as Record<string, unknown>[]) {
    const name = String(item.name ?? "").trim();
    const priceCents = Math.round(Number(item.priceCents));
    const quantity = Math.round(Number(item.quantity));
    if (name.length < 2) return "Cada entrada necesita un nombre.";
    if (!Number.isFinite(priceCents) || priceCents < 0) return `El precio de "${name}" no es válido.`;
    if (!Number.isInteger(quantity) || quantity < 1) return `El cupo de "${name}" debe ser al menos 1.`;
    const window = parseWindow(item.startDay, item.endDay);
    if (typeof window === "string") return `"${name}": ${window}`;
    out.push({ name, priceCents, quantity, salesStart: window.start, salesEnd: window.end });
  }
  if (new Set(out.map((t) => t.name.toLowerCase())).size !== out.length) return "No puede haber dos entradas con el mismo nombre.";
  return out;
}

// El formulario usa datetime-local (sin zona): se interpreta como hora de Venezuela (UTC-4).
function parseVeDate(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return null;
  const d = new Date(`${s}:00-04:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

interface EventFields {
  title: string;
  description: string;
  venue_name: string;
  category_id: string | null;
  city_id: string | null;
  starts_at: string;
}

function parseEventFields(formData: FormData): EventFields | string {
  const title = String(formData.get("title") ?? "").trim();
  const venue = String(formData.get("venue_name") ?? "").trim();
  const startsAt = parseVeDate(formData.get("starts_at"));
  if (title.length < 3) return "Escribe el nombre del evento.";
  if (venue.length < 2) return "Escribe el lugar del evento.";
  if (!startsAt) return "Elige la fecha y la hora.";
  return {
    title,
    venue_name: venue,
    description: String(formData.get("description") ?? "").trim(),
    category_id: String(formData.get("category_id") ?? "") || null,
    city_id: String(formData.get("city_id") ?? "") || null,
    starts_at: startsAt,
  };
}

export async function createEventAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { organizer } = await requireOrganizer();
  const fields = parseEventFields(formData);
  if (typeof fields === "string") return { error: fields };
  const tickets = parseTickets(formData.get("tickets"));
  if (typeof tickets === "string") return { error: tickets };
  if (new Date(fields.starts_at).getTime() < Date.now()) return { error: "La fecha del evento ya pasó." };

  const durationHours = Math.min(24, Math.max(1, Number(formData.get("duration_hours")) || 3));
  const ends_at = new Date(new Date(fields.starts_at).getTime() + durationHours * 3600 * 1000).toISOString();

  const collected = await collectImages(formData, organizer.id);
  if (collected.error) return { error: collected.error };
  const publishAt = parsePublishAt(formData.get("publish_at"));
  if (publishAt === "invalid") return { error: "La fecha de publicación no es válida." };
  if (publishAt && new Date(publishAt).getTime() > new Date(fields.starts_at).getTime()) return { error: "La publicación debe ser antes del evento." };

  const supabase = await supabaseServer();
  const { data: event, error } = await supabase
    .from("events")
    .insert({
      organizer_id: organizer.id,
      slug: `${slugify(fields.title)}-${Date.now().toString(36)}`,
      kind: "event",
      is_community: formData.get("is_community") === "on",
      images: collected.urls ?? [],
      ends_at,
      status: publishAt && new Date(publishAt).getTime() > Date.now() ? "draft" : "published",
      publish_at: publishAt && new Date(publishAt).getTime() > Date.now() ? publishAt : null,
      refund_policy: "24h",
      min_age: 0,
      source: "organizer",
      ...fields,
    })
    .select("id")
    .single();
  if (error || !event) return { error: dbError(error?.message, "No pudimos crear el evento. Intenta de nuevo.") };

  const { error: ttError } = await supabase.from("ticket_types").insert(
    tickets.map((t) => ({ event_id: event.id, name: t.name, price_cents: t.priceCents, quantity: t.quantity, sales_start: t.salesStart, sales_end: t.salesEnd, min_per_order: 1, max_per_order: 6 }))
  );
  if (ttError) return { error: "El evento se creó, pero fallaron las entradas. Ábrelo y agrégalas." };

  revalidatePath("/organizador", "layout");
  redirect(`/organizador/eventos/${event.id}`);
}

export async function updateEventAction(eventId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { organizer } = await requireOrganizer();
  const fields = parseEventFields(formData);
  if (typeof fields === "string") return { error: fields };

  const update: Record<string, unknown> = { ...fields, updated_at: new Date().toISOString() };
  const collected = await collectImages(formData, organizer.id);
  if (collected.error) return { error: collected.error };
  update.images = collected.urls ?? [];
  update.is_community = formData.get("is_community") === "on";
  if (formData.has("publish_at")) {
    const publishAt = parsePublishAt(formData.get("publish_at"));
    if (publishAt === "invalid") return { error: "La fecha de publicación no es válida." };
    update.publish_at = publishAt;
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.from("events").update(update).eq("id", eventId).eq("organizer_id", organizer.id);
  if (error) return { error: dbError(error.message, "No pudimos guardar los cambios.") };
  revalidatePath("/organizador", "layout");
  return { ok: "Cambios guardados." };
}

export async function setSalesPausedAction(eventId: string, paused: boolean): Promise<void> {
  const { organizer } = await requireOrganizer();
  const supabase = await supabaseServer();
  await supabase.from("events").update({ sales_paused: paused }).eq("id", eventId).eq("organizer_id", organizer.id);
  revalidatePath("/organizador", "layout");
}

export async function publishEventAction(eventId: string): Promise<void> {
  const { organizer } = await requireOrganizer();
  const supabase = await supabaseServer();
  await supabase.from("events").update({ status: "published" }).eq("id", eventId).eq("organizer_id", organizer.id).eq("status", "draft");
  revalidatePath("/organizador", "layout");
}

export async function duplicateEventAction(eventId: string): Promise<void> {
  const { organizer } = await requireOrganizer();
  const supabase = await supabaseServer();
  const { data: src } = await supabase
    .from("events")
    .select("title, kind, category_id, city_id, description, images, venue_name, venue_address, venue_lat, venue_lng, starts_at, ends_at, refund_policy, min_age, ticket_types(name, price_cents, quantity, min_per_order, max_per_order)")
    .eq("id", eventId)
    .eq("organizer_id", organizer.id)
    .single();
  if (!src) return;
  const shift = 7 * 24 * 3600 * 1000;
  const { data: copy, error } = await supabase
    .from("events")
    .insert({
      organizer_id: organizer.id,
      title: `${src.title} (copia)`,
      slug: `${slugify(src.title)}-${Date.now().toString(36)}`,
      kind: src.kind,
      category_id: src.category_id,
      city_id: src.city_id,
      description: src.description,
      images: src.images,
      venue_name: src.venue_name,
      venue_address: src.venue_address,
      venue_lat: src.venue_lat,
      venue_lng: src.venue_lng,
      starts_at: new Date(new Date(src.starts_at).getTime() + shift).toISOString(),
      ends_at: src.ends_at ? new Date(new Date(src.ends_at).getTime() + shift).toISOString() : null,
      status: "draft",
      refund_policy: src.refund_policy,
      min_age: src.min_age,
      source: "organizer",
    })
    .select("id")
    .single();
  if (error || !copy) return;
  const types = (src.ticket_types ?? []) as { name: string; price_cents: number; quantity: number; min_per_order: number; max_per_order: number }[];
  if (types.length > 0) {
    await supabase.from("ticket_types").insert(types.map((t) => ({ ...t, event_id: copy.id })));
  }
  revalidatePath("/organizador", "layout");
  redirect(`/organizador/eventos/${copy.id}/editar`);
}

export async function repeatEventAction(eventId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireOrganizer();
  const count = Math.round(Number(formData.get("count")));
  const interval = Math.round(Number(formData.get("interval")));
  if (!Number.isInteger(count) || count < 1 || count > 12) return { error: "Puedes crear de 1 a 12 copias." };
  if (!Number.isInteger(interval) || interval < 1) return { error: "Elige cada cuánto se repite." };
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("repeat_event", { p_event_id: eventId, p_count: count, p_interval_days: interval, p_publish: false });
  if (error) return { error: dbError(error.message, "No pudimos crear las copias.") };
  revalidatePath("/organizador", "layout");
  return { ok: `Listo: ${count} ${count === 1 ? "copia creada" : "copias creadas"} como borrador. Las encuentras en Eventos > Borradores.` };
}

export async function cancelEventAction(eventId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireOrganizer();
  const reason = String(formData.get("reason") ?? "").trim();
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("cancel_event", { p_event_id: eventId, p_reason: reason });
  if (error) return { error: dbError(error.message, "No pudimos cancelar el evento.") };
  revalidatePath("/organizador", "layout");
  return { ok: `Evento cancelado. ${Number(data ?? 0)} ${Number(data) === 1 ? "compra quedó" : "compras quedaron"} por reembolsar.` };
}

export async function saveTicketTypeAction(ticketTypeId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireOrganizer();
  const name = String(formData.get("name") ?? "").trim();
  const priceCents = Math.round(Number(String(formData.get("price") ?? "").replace(",", ".")) * 100);
  const quantity = Math.round(Number(formData.get("quantity")));
  if (name.length < 2) return { error: "Escribe el nombre de la entrada." };
  if (!Number.isFinite(priceCents) || priceCents < 0) return { error: "El precio no es válido." };
  if (!Number.isInteger(quantity) || quantity < 1) return { error: "El cupo debe ser al menos 1." };
  const window = parseWindow(formData.get("start_day"), formData.get("end_day"));
  if (typeof window === "string") return { error: window };
  const lmPct = Number(formData.get("lm_pct")) || null;
  const lmHours = lmPct ? Number(formData.get("lm_hours")) || 24 : null;
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("ticket_types")
    .update({ name, price_cents: priceCents, quantity, sales_start: window.start, sales_end: window.end, last_minute_pct: lmPct, last_minute_hours: lmHours, updated_at: new Date().toISOString() })
    .eq("id", ticketTypeId);
  if (error) return { error: dbError(error.message, "No pudimos guardar la entrada.") };
  revalidatePath("/organizador", "layout");
  return { ok: "Entrada actualizada." };
}

export async function addTicketTypeAction(eventId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireOrganizer();
  const name = String(formData.get("name") ?? "").trim();
  const priceCents = Math.round(Number(String(formData.get("price") ?? "0").replace(",", ".") || 0) * 100);
  const quantity = Math.round(Number(formData.get("quantity")));
  if (name.length < 2) return { error: "Escribe el nombre de la entrada." };
  if (!Number.isFinite(priceCents) || priceCents < 0) return { error: "El precio no es válido." };
  if (!Number.isInteger(quantity) || quantity < 1) return { error: "El cupo debe ser al menos 1." };
  const window = parseWindow(formData.get("start_day"), formData.get("end_day"));
  if (typeof window === "string") return { error: window };
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("ticket_types")
    .insert({ event_id: eventId, name, price_cents: priceCents, quantity, sales_start: window.start, sales_end: window.end, min_per_order: 1, max_per_order: 6 });
  if (error) return { error: dbError(error.message, "No pudimos agregar la entrada.") };
  revalidatePath("/organizador", "layout");
  return { ok: "Entrada agregada." };
}

export async function deleteTicketTypeAction(ticketTypeId: string): Promise<void> {
  await requireOrganizer();
  const supabase = await supabaseServer();
  await supabase.from("ticket_types").delete().eq("id", ticketTypeId);
  revalidatePath("/organizador", "layout");
}

export async function checkInAction(eventId: string, code: string): Promise<void> {
  await requireOrganizer();
  const supabase = await supabaseServer();
  await supabase.rpc("checkin_ticket", { p_code: code, p_event_id: eventId });
  revalidatePath(`/organizador/eventos/${eventId}`);
}

export async function requestWithdrawalAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireOrganizer();
  const amountCents = Math.round(Number(String(formData.get("amount") ?? "").replace(",", ".")) * 100);
  const method = String(formData.get("method") ?? "");
  const account = String(formData.get("account") ?? "").trim();
  if (!Number.isFinite(amountCents) || amountCents <= 0) return { error: "Escribe el monto que quieres retirar." };
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("request_withdrawal", { p_amount_cents: amountCents, p_method: method, p_account: account });
  if (error) return { error: dbError(error.message, "No pudimos solicitar el retiro.") };
  revalidatePath("/organizador", "layout");
  return { ok: "Recibimos tu solicitud. Te pagamos en 1 a 2 días hábiles." };
}

export async function addStaffAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireOrganizer();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "door");
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Escribe un correo válido." };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("add_door_staff", { p_email: email, p_role: role });
  if (error) return { error: dbError(error.message, "No pudimos agregar a esa persona.") };
  revalidatePath("/organizador/equipo");
  const status = (data as { status?: string } | null)?.status;
  return { ok: status === "invited" ? "Invitación guardada. Cuando cree su cuenta en Plann entrará al equipo sola." : "Listo. Ya forma parte de tu equipo." };
}

export async function cancelStaffInviteAction(id: string): Promise<void> {
  await requireOrganizer();
  const supabase = await supabaseServer();
  await supabase.rpc("cancel_staff_invite", { p_invite_id: id });
  revalidatePath("/organizador/equipo");
}

export async function removeStaffAction(staffId: string): Promise<void> {
  await requireOrganizer();
  const supabase = await supabaseServer();
  await supabase.rpc("remove_door_staff", { p_staff_id: staffId });
  revalidatePath("/organizador/equipo");
}

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { organizer } = await requireOrganizer();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 3) return { error: "El nombre del negocio es muy corto." };
  const method = String(formData.get("payout_method") ?? "");
  const update: Record<string, unknown> = {
    name,
    bio: String(formData.get("bio") ?? "").trim() || null,
    contact_phone: String(formData.get("contact_phone") ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  };
  if (["pago_movil", "transfer", "zelle"].includes(method)) {
    update.payout_method = method;
    update.payout_account = String(formData.get("payout_account") ?? "").trim() || null;
  }
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const uploaded = await uploadImage(logo, organizer.id, "logo-");
    if (uploaded.error) return { error: uploaded.error };
    update.logo_url = uploaded.url;
  }
  const supabase = await supabaseServer();
  const { error } = await supabase.from("organizers").update(update).eq("id", organizer.id);
  if (error) return { error: dbError(error.message, "No pudimos guardar tu perfil.") };
  revalidatePath("/organizador", "layout");
  return { ok: "Perfil actualizado." };
}

export async function createCouponAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { organizer } = await requireOrganizer();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const type = String(formData.get("type") ?? "percent");
  const raw = Number(String(formData.get("value") ?? "").replace(",", "."));
  const eventId = String(formData.get("event_id") ?? "") || null;
  const maxRaw = String(formData.get("max_uses") ?? "").trim();
  const maxUses = maxRaw === "" ? null : Math.round(Number(maxRaw));
  if (!/^[A-Z0-9_-]{3,20}$/.test(code)) return { error: "El código debe tener entre 3 y 20 letras o números, sin espacios." };
  if (type !== "percent" && type !== "fixed") return { error: "Elige el tipo de descuento." };
  const value = type === "percent" ? Math.round(raw) : Math.round(raw * 100);
  if (!Number.isFinite(raw) || raw <= 0 || (type === "percent" && value > 100)) return { error: "El descuento no es válido." };
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) return { error: "Los usos máximos deben ser al menos 1." };

  const supabase = await supabaseServer();
  const { error } = await supabase.from("coupons").insert({
    organizer_id: organizer.id,
    event_id: eventId,
    code,
    discount_type: type,
    discount_value: value,
    max_uses: maxUses,
  });
  if (error) return { error: error.code === "23505" ? "Ya tienes un cupón con ese código." : "No pudimos crear el cupón." };
  revalidatePath("/organizador/cupones");
  return { ok: "Cupón creado." };
}

export async function toggleCouponAction(id: string, active: boolean): Promise<void> {
  await requireOrganizer();
  const supabase = await supabaseServer();
  await supabase.from("coupons").update({ active }).eq("id", id);
  revalidatePath("/organizador/cupones");
}

export async function deleteCouponAction(id: string): Promise<void> {
  await requireOrganizer();
  const supabase = await supabaseServer();
  await supabase.from("coupons").delete().eq("id", id);
  revalidatePath("/organizador/cupones");
}

export async function issueCompAction(eventId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireOrganizer();
  const email = String(formData.get("email") ?? "").trim();
  const ticketTypeId = String(formData.get("ticket_type_id") ?? "");
  const quantity = Math.round(Number(formData.get("quantity")));
  const note = String(formData.get("note") ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Escribe un correo válido." };
  if (!ticketTypeId) return { error: "Elige el tipo de entrada." };
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 6) return { error: "Puedes regalar de 1 a 6 entradas." };
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("issue_comp_tickets", { p_ticket_type_id: ticketTypeId, p_email: email, p_quantity: quantity, p_note: note || null });
  if (error) return { error: dbError(error.message, "No pudimos enviar la cortesía.") };
  revalidatePath(`/organizador/eventos/${eventId}`);
  return { ok: `Listo. ${email} ya tiene ${quantity === 1 ? "su entrada" : "sus entradas"} en la app.` };
}

export async function sendAnnouncementAction(eventId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireOrganizer();
  const message = String(formData.get("message") ?? "").trim();
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("send_event_announcement", { p_event_id: eventId, p_message: message });
  if (error) return { error: dbError(error.message, "No pudimos enviar el mensaje.") };
  revalidatePath(`/organizador/eventos/${eventId}`);
  const n = Number(data ?? 0);
  return { ok: `Mensaje enviado a ${n} ${n === 1 ? "persona" : "personas"}.` };
}

export async function refundOrderAction(orderId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireOrganizer();
  const reason = String(formData.get("reason") ?? "").trim();
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("request_order_refund", { p_order_id: orderId, p_reason: reason });
  if (error) return { error: dbError(error.message, "No pudimos reembolsar esta compra.") };
  revalidatePath("/organizador", "layout");
  return { ok: "Compra anulada. Sale de tu saldo y queda por devolver al comprador." };
}

export async function replyReviewAction(reviewId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireOrganizer();
  const reply = String(formData.get("reply") ?? "").trim();
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("reply_review", { p_review_id: reviewId, p_reply: reply });
  if (error) return { error: dbError(error.message, "No pudimos enviar tu respuesta.") };
  revalidatePath("/organizador/resenas");
  return { ok: "Respuesta publicada." };
}

export async function markNotificationsReadAction(): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  revalidatePath("/organizador", "layout");
}

export async function createSupportTicketAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireOrganizer();
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("create_support_ticket", {
    p_category: String(formData.get("category") ?? "otro"),
    p_subject: String(formData.get("subject") ?? ""),
    p_body: String(formData.get("body") ?? ""),
    p_order_id: null,
    p_event_id: null,
  });
  if (error) return { error: dbError(error.message, "No pudimos enviar tu consulta.") };
  revalidatePath("/organizador/soporte");
  const t = data as { id: string; priority: string };
  redirect(`/organizador/soporte/${t.id}`);
}

export async function replySupportAction(ticketId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireOrganizer();
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("reply_support_ticket", { p_ticket_id: ticketId, p_body: String(formData.get("body") ?? "") });
  if (error) return { error: dbError(error.message, "No pudimos enviar tu mensaje.") };
  revalidatePath(`/organizador/soporte/${ticketId}`);
  return { ok: "Mensaje enviado." };
}
