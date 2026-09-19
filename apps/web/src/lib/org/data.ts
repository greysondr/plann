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
}

export interface EventRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
  images: string[];
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
  "id, title, slug, status, starts_at, ends_at, images, description, venue_name, sales_paused, cancelled_reason, ticket_types(id, name, price_cents, quantity, sold, reserved), categories(name), cities(name)";

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
        "id, user_id, event_id, ticket_type_id, quantity, status, subtotal_cents, total_usd_cents, commission_cents, organizer_net_cents, currency_paid, created_at, paid_at"
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
    (data as BalanceRow | null) ?? { net_paid_cents: 0, withdrawn_cents: 0, pending_withdrawal_cents: 0, balance_available_cents: 0 }
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
  created_at: string;
}

export async function loadStaff(organizerId: string): Promise<StaffRow[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("organizer_staff")
    .select("id, email, full_name, created_at")
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
