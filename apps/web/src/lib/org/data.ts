import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type { OrderRow, TicketRow } from "./analytics";

export interface TicketTypeRow {
  id: string;
  name: string;
  price_cents: number;
  quantity: number;
  sold: number;
  reserved: number;
  sales_start: string | null;
  sales_end: string | null;
}

export interface EventRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
  images: string[];
  publish_at: string | null;
  description: string | null;
  venue_name: string | null;
  sales_paused: boolean;
  cancelled_reason: string | null;
  ticket_types: TicketTypeRow[];
  categories: { name: string } | null;
  cities: { name: string } | null;
}

export interface BalanceRow {
  net_paid_cents: number;
  withdrawn_cents: number;
  pending_withdrawal_cents: number;
  balance_available_cents: number;
  refund_pending_cents: number;
}

// Lo vendido que todavía no se libera para retirar (según el plan del organizador).
export function pendingRelease(b: BalanceRow): number {
  return Math.max(0, b.net_paid_cents - (b.balance_available_cents + b.withdrawn_cents + b.pending_withdrawal_cents));
}

export interface WithdrawalRow {
  id: string;
  amount_cents: number;
  method: string;
  reference: string | null;
  status: "pendiente" | "pagado" | "rechazado";
  requested_at: string;
}

const PAGE = 1000;

// PostgREST corta cada respuesta en 1000 filas: se pide por páginas.
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(String((error as { message?: string }).message ?? error));
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

const EVENT_COLUMNS =
  "id, title, slug, status, starts_at, ends_at, images, publish_at, description, venue_name, sales_paused, cancelled_reason, ticket_types(id, name, price_cents, quantity, sold, reserved, sales_start, sales_end), categories(name), cities(name)";

export async function loadEvents(organizerId: string): Promise<EventRow[]> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("organizer_id", organizerId)
    .order("starts_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as EventRow[];
}

export async function loadOrders(eventIds: string[]): Promise<OrderRow[]> {
  if (eventIds.length === 0) return [];
  const supabase = await supabaseServer();
  return fetchAll<OrderRow>((from, to) =>
    supabase
      .from("orders")
      .select(
        "id, user_id, event_id, ticket_type_id, quantity, status, subtotal_cents, total_usd_cents, commission_cents, organizer_net_cents, currency_paid, discount_cents, is_comp, created_at, paid_at"
      )
      .in("event_id", eventIds)
      .order("created_at", { ascending: false })
      .range(from, to) as unknown as PromiseLike<{ data: OrderRow[] | null; error: unknown }>
  );
}

export async function loadTickets(eventIds: string[]): Promise<TicketRow[]> {
  if (eventIds.length === 0) return [];
  const supabase = await supabaseServer();
  return fetchAll<TicketRow>((from, to) =>
    supabase
      .from("tickets")
      .select("id, event_id, ticket_type_id, status, checked_in_at")
      .in("event_id", eventIds)
      .order("created_at", { ascending: false })
      .range(from, to) as unknown as PromiseLike<{ data: TicketRow[] | null; error: unknown }>
  );
}

export async function loadBalance(organizerId: string): Promise<BalanceRow> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("organizer_balances").select("*").eq("organizer_id", organizerId).maybeSingle();
  return (
    (data as BalanceRow | null) ?? { net_paid_cents: 0, withdrawn_cents: 0, pending_withdrawal_cents: 0, balance_available_cents: 0, refund_pending_cents: 0 }
  );
}

export async function loadWithdrawals(organizerId: string): Promise<WithdrawalRow[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("withdrawals")
    .select("id, amount_cents, method, reference, status, requested_at")
    .eq("organizer_id", organizerId)
    .order("requested_at", { ascending: false });
  return (data ?? []) as WithdrawalRow[];
}

export function eventNames(events: EventRow[]): Map<string, string> {
  return new Map(events.map((e) => [e.id, e.title]));
}

export function ticketTypeNames(events: EventRow[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of events) for (const t of e.ticket_types) m.set(t.id, `${t.name} · ${e.title}`);
  return m;
}

export interface AttendeeRow {
  ticket_id: string;
  code: string;
  attendee_name: string;
  ticket_type_name: string;
  status: string;
  checked_in_at: string | null;
  total_usd_cents: number;
}

export async function loadAttendees(eventId: string): Promise<AttendeeRow[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc("list_event_attendees", { p_event_id: eventId });
  return (data ?? []) as AttendeeRow[];
}

export interface StaffRow {
  id: string;
  email: string;
  full_name: string | null;
  role: "door" | "editor" | "finance";
  created_at: string;
}

export interface StaffInviteRow {
  id: string;
  email: string;
  role: "door" | "editor" | "finance";
  created_at: string;
}

export async function loadStaffInvites(organizerId: string): Promise<StaffInviteRow[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("staff_invites").select("id, email, role, created_at").eq("organizer_id", organizerId).order("created_at");
  return (data ?? []) as StaffInviteRow[];
}

export async function loadStaff(organizerId: string): Promise<StaffRow[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("organizer_staff")
    .select("id, email, full_name, role, created_at")
    .eq("organizer_id", organizerId)
    .order("created_at");
  return (data ?? []) as StaffRow[];
}

export async function loadCatalog(): Promise<{ categories: { id: string; name: string }[]; cities: { id: string; name: string }[] }> {
  const supabase = await supabaseServer();
  const [{ data: categories }, { data: cities }] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("cities").select("id, name").order("name"),
  ]);
  return { categories: categories ?? [], cities: cities ?? [] };
}

export interface CouponRow {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  event_id: string | null;
  max_uses: number | null;
  per_user_limit: number;
  valid_until: string | null;
  active: boolean;
  uses: number;
}

export async function loadCoupons(organizerId: string): Promise<CouponRow[]> {
  const supabase = await supabaseServer();
  const [{ data: rows }, { data: reds }] = await Promise.all([
    supabase.from("coupons").select("*").eq("organizer_id", organizerId).order("created_at", { ascending: false }),
    supabase.from("coupon_redemptions").select("coupon_id, orders(status)"),
  ]);
  const uses = new Map<string, number>();
  for (const r of (reds ?? []) as unknown as { coupon_id: string; orders: { status: string } | null }[]) {
    if (r.orders?.status === "expired" || r.orders?.status === "cancelled") continue;
    uses.set(r.coupon_id, (uses.get(r.coupon_id) ?? 0) + 1);
  }
  return ((rows ?? []) as Omit<CouponRow, "uses">[]).map((c) => ({ ...c, uses: uses.get(c.id) ?? 0 }));
}

export interface AnnouncementRow {
  id: string;
  message: string;
  recipients: number;
  created_at: string;
}

export async function loadAnnouncements(eventId: string): Promise<AnnouncementRow[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("announcements").select("id, message, recipients, created_at").eq("event_id", eventId).order("created_at", { ascending: false }).limit(5);
  return (data ?? []) as AnnouncementRow[];
}

export async function loadViews(eventIds: string[], days = 90): Promise<import("./analytics").ViewRow[]> {
  if (eventIds.length === 0) return [];
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc("event_view_stats", { p_event_ids: eventIds, p_days: days });
  return ((data ?? []) as { event_id: string; day: string; views: number }[]).map((r) => ({ event_id: r.event_id, day: r.day, views: Number(r.views) }));
}

export interface OwnReview {
  id: string;
  event_id: string;
  rating: number;
  comment: string | null;
  author_name: string;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export async function loadReviews(organizerId: string): Promise<OwnReview[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("reviews")
    .select("id, event_id, rating, comment, author_name, reply, replied_at, created_at")
    .eq("organizer_id", organizerId)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []) as OwnReview[];
}

export async function loadFollowers(organizerId: string): Promise<number> {
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc("organizer_followers", { p_organizer_id: organizerId });
  return Number(data ?? 0);
}

export async function loadLinkStats(eventId: string): Promise<{ src: string; visits: number }[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc("event_link_stats", { p_event_id: eventId });
  return ((data ?? []) as { src: string; visits: number }[]).map((r) => ({ src: r.src, visits: Number(r.visits) }));
}

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export async function loadNotifications(limit = 60): Promise<NotificationRow[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("notifications").select("id, type, title, body, data, read_at, created_at").order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as NotificationRow[];
}

export async function countUnread(): Promise<number> {
  const supabase = await supabaseServer();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  return count ?? 0;
}

export interface SupportTicketRow {
  id: string;
  category: string;
  subject: string;
  status: "abierto" | "en_proceso" | "resuelto" | "cerrado";
  priority: "normal" | "alta";
  created_at: string;
  last_message_at: string;
}

export interface TicketMessageRow {
  id: string;
  author_role: "user" | "staff";
  body: string;
  created_at: string;
}

export async function loadSupportTickets(): Promise<SupportTicketRow[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("support_tickets").select("id, category, subject, status, priority, created_at, last_message_at").order("last_message_at", { ascending: false });
  return (data ?? []) as SupportTicketRow[];
}

export async function loadSupportTicket(id: string): Promise<{ ticket: SupportTicketRow; messages: TicketMessageRow[] } | null> {
  const supabase = await supabaseServer();
  const { data: ticket } = await supabase.from("support_tickets").select("id, category, subject, status, priority, created_at, last_message_at").eq("id", id).maybeSingle();
  if (!ticket) return null;
  const { data: messages } = await supabase.from("support_messages").select("id, author_role, body, created_at").eq("ticket_id", id).order("created_at");
  return { ticket: ticket as SupportTicketRow, messages: (messages ?? []) as TicketMessageRow[] };
}
