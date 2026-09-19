import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { cancelEventReminder, presentLocalNotification, registerPushToken, scheduleEventReminder } from "../lib/notifications";
import { FIRST_PURCHASE_BONUS, getTierForPoints, type LoyaltyTier } from "../core/loyalty";
import type { OrderRow, TicketRow } from "../core/orgAnalytics";
import type {
  EventItem,
  LoyaltyEntry,
  Order,
  OrganizerStatus,
  PaymentMethod,
  TicketRecord,
  TicketType,
  Organizer,
} from "../core/types";

// Puente entre el modelo real de Supabase (packages/db/database.types) y las
// pantallas que ya construimos sobre datos simulados: se mapea cada fila a
// los mismos tipos de src/core/types.ts para no tener que tocar cada
// pantalla. Ver docs/decisiones/2026-09-17-backend-real.md.

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "plan"
  );
}

function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// public.organizers.verification_status vive en español en la base de datos
// ('pendiente'|'verificado'|'rechazado'|'suspendido'); OrganizerStatus es el
// tipo en inglés que ya usaban las pantallas. Sin este mapeo, un cast directo
// dejaba el estado literalmente en "verificado" y todo lo que compara contra
// "verified" (useOrganizerGuard, perfil.tsx) fallaba siempre, aunque la base
// de datos dijera que sí estabas verificado.
function mapOrganizerStatus(dbStatus: string): OrganizerStatus {
  if (dbStatus === "verificado") return "verified";
  if (dbStatus === "pendiente") return "pending";
  if (dbStatus === "rechazado") return "rejected";
  if (dbStatus === "suspendido") return "suspended";
  return "none";
}

// Errores de las funciones de Postgres (raise exception 'xxx') -> texto para el usuario.
const DB_ERROR_MESSAGES: Record<string, string> = {
  insufficient_balance: "No tienes saldo suficiente para ese monto.",
  below_minimum: "El retiro mínimo es de $5,00.",
  account_required: "Escribe los datos de la cuenta donde quieres recibir el pago.",
  organizer_not_verified: "Tu cuenta de organizador todavía no está verificada.",
  quantity_below_sold: "El cupo no puede ser menor a lo que ya se vendió.",
  event_closed: "Este evento ya está cerrado y no se puede modificar.",
  user_not_found: "No hay ninguna cuenta de Plann con ese correo. Pídele que se registre primero.",
  cannot_add_self: "Ya eres el dueño, no hace falta agregarte.",
  reason_required: "Cuéntale a tus compradores por qué se cancela (mínimo 5 letras).",
  sales_paused: "El organizador pausó las ventas de este evento.",
  coupon_invalid: "Ese código no existe o no aplica a este evento.",
  coupon_expired: "Ese cupón ya venció o todavía no está activo.",
  coupon_exhausted: "Ese cupón ya se agotó.",
  coupon_used: "Ya usaste este cupón.",
  message_length: "El mensaje debe tener entre 5 y 500 caracteres.",
  announcement_limit: "Ya enviaste 3 mensajes a este evento hoy. Intenta mañana.",
};

function dbErrorMessage(message: string | undefined, fallback: string): string {
  if (!message) return fallback;
  const key = Object.keys(DB_ERROR_MESSAGES).find((k) => message.includes(k));
  return key ? DB_ERROR_MESSAGES[key] : fallback;
}

interface CreateOrderResult {
  ok: boolean;
  order?: Order;
  reason?: string;
}

export interface OrganizerProfile {
  name: string;
  document: string;
  bio?: string;
  phone?: string;
  logoUrl?: string;
  plan: "basico" | "pro" | "business";
  commissionRate: number;
  rejectionReason?: string;
  payoutMethod?: PaymentMethod;
  payoutAccount?: string;
}

export interface OrganizerProfileInput {
  name: string;
  bio: string;
  phone: string;
  payoutMethod?: PaymentMethod;
  payoutAccount: string;
  logoUri?: string;
}

export interface Withdrawal {
  id: string;
  amountCents: number;
  method: PaymentMethod;
  account: string;
  status: "pendiente" | "pagado" | "rechazado";
  requestedAt: string;
}

export interface OrganizerBalance {
  netPaidCents: number;
  withdrawnCents: number;
  pendingCents: number;
  availableCents: number;
}

export interface EventEditInput {
  title: string;
  description: string;
  venueName: string;
  venueAddress?: string;
  lat?: number;
  lng?: number;
  category?: string;
  city?: string;
  startsAt: string;
  imageUri?: string;
}

type Result = { ok: boolean; reason?: string };

export interface NewTicketInput {
  name: string;
  priceCents: number; // 0 = gratis
  quantity: number;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  readAt?: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  eventId: string | null;
  maxUses: number | null;
  perUserLimit: number;
  validUntil?: string;
  active: boolean;
  uses: number;
}

export interface NewCouponInput {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number; // % (1-100) o centavos
  eventId: string | null;
  maxUses: number | null;
  validUntil?: string;
}

export interface StaffMember {
  id: string;
  email: string;
  name: string;
}

export interface StaffAssignment {
  organizerId: string;
  organizerName: string;
}

export interface Attendee {
  ticketId: string;
  code: string;
  name: string;
  ticketTypeName: string;
  status: "valid" | "used" | "void" | string;
  checkedInAt?: string;
  totalCents: number;
}

export interface NewEventInput {
  title: string;
  category: string;
  city: string;
  venueName: string;
  venueAddress?: string;
  lat?: number;
  lng?: number;
  description: string;
  startsAt: string;
  durationMinutes: number;
  tickets: NewTicketInput[];
  imageUri?: string; // uri local (file://...) elegida con expo-image-picker
}

interface AppStoreValue {
  loading: boolean;
  isSignedIn: boolean;
  userEmail: string | null;

  events: EventItem[];
  categories: string[];
  cities: string[];
  orders: Order[];
  organizerOrders: Order[];
  tickets: TicketRecord[];
  favorites: string[];
  reminders: string[];
  loyaltyEntries: LoyaltyEntry[];
  organizerStatus: OrganizerStatus;
  organizerProfile: OrganizerProfile | null;
  myOrganizerId: string | null;
  balance: OrganizerBalance;
  withdrawals: Withdrawal[];
  analyticsOrders: OrderRow[];
  analyticsTickets: TicketRow[];
  notifications: AppNotification[];
  unreadCount: number;
  markNotificationsRead: (ids?: string[]) => Promise<void>;
  staff: StaffMember[];
  staffAssignments: StaffAssignment[];
  coupons: Coupon[];
  createCoupon: (input: NewCouponInput) => Promise<Result>;
  setCouponActive: (id: string, active: boolean) => Promise<Result>;
  deleteCoupon: (id: string) => Promise<Result>;
  issueComp: (ticketTypeId: string, email: string, quantity: number, note?: string) => Promise<Result>;
  sendAnnouncement: (eventId: string, message: string) => Promise<Result & { recipients?: number }>;

  rateApplied: number;
  points: number;
  tier: LoyaltyTier;

  signUp: (email: string, password: string, fullName: string) => Promise<{ ok: boolean; reason?: string }>;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; reason?: string }>;
  signOut: () => Promise<void>;

  createOrder: (ticketTypeId: string, quantity: number, couponCode?: string) => Promise<CreateOrderResult>;
  previewCoupon: (ticketTypeId: string, quantity: number, code: string) => Promise<{ valid: boolean; discountCents: number; reason?: string }>;
  submitPaymentReference: (orderId: string, method: PaymentMethod, reference: string, bank?: string) => Promise<{ ok: boolean; reason?: string }>;
  checkIn: (code: string, eventId?: string) => Promise<{ status: "valid" | "used" | "invalid"; attendeeName?: string; checkedInAt?: string }>;
  toggleFavorite: (eventId: string) => Promise<void>;
  toggleReminder: (eventId: string) => Promise<boolean>;
  requestOrganizerVerification: (name: string, document: string) => Promise<void>;
  createEvent: (input: NewEventInput) => Promise<boolean>;
  updateEvent: (eventId: string, input: EventEditInput) => Promise<Result>;
  publishEvent: (eventId: string) => Promise<Result>;
  duplicateEvent: (eventId: string) => Promise<{ ok: boolean; eventId?: string; reason?: string }>;
  updateOrganizerProfile: (input: OrganizerProfileInput) => Promise<Result>;
  updateTicketType: (ticketTypeId: string, name: string, priceCents: number, quantity: number) => Promise<Result>;
  addTicketType: (eventId: string, ticket: NewTicketInput) => Promise<Result>;
  deleteTicketType: (ticketTypeId: string) => Promise<Result>;
  addStaff: (email: string) => Promise<Result>;
  removeStaff: (staffId: string) => Promise<Result>;
  fetchAttendees: (eventId: string) => Promise<Attendee[]>;
  fetchCheckinCounts: (eventId: string) => Promise<{ total: number; used: number } | null>;
  setSalesPaused: (eventId: string, paused: boolean) => Promise<Result>;
  cancelEvent: (eventId: string, reason: string) => Promise<Result & { refunds?: number }>;
  requestWithdrawal: (amountCents: number, method: PaymentMethod, account: string) => Promise<Result>;
  ticketsForOrder: (orderId: string) => TicketRecord[];
  getOrganizer: (id: string | null | undefined) => Organizer | undefined;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [organizersById, setOrganizersById] = useState<Record<string, Organizer>>({});
  const [categories, setCategories] = useState<string[]>(["Todos"]);
  const [cities, setCities] = useState<string[]>([]);
  const categoryIdByName = useRef<Map<string, string>>(new Map());
  const cityIdByName = useRef<Map<string, string>>(new Map());

  const [orders, setOrders] = useState<Order[]>([]);
  const [organizerOrders, setOrganizerOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [reminders, setReminders] = useState<string[]>([]);
  const [loyaltyEntries, setLoyaltyEntries] = useState<LoyaltyEntry[]>([]);
  const [organizerStatus, setOrganizerStatus] = useState<OrganizerStatus>("none");
  const [organizerProfile, setOrganizerProfile] = useState<OrganizerProfile | null>(null);
  const [myOrganizerId, setMyOrganizerId] = useState<string | null>(null);
  const [balance, setBalance] = useState<OrganizerBalance>({ netPaidCents: 0, withdrawnCents: 0, pendingCents: 0, availableCents: 0 });
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [analyticsOrders, setAnalyticsOrders] = useState<OrderRow[]>([]);
  const [analyticsTickets, setAnalyticsTickets] = useState<TicketRow[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([]);
  const [rateApplied, setRateApplied] = useState(0);

  const userId = session?.user.id ?? null;

  // --- Catálogo público: categorías, ciudades, tasa del día -----------------
  const fetchCatalog = useCallback(async () => {
    const [{ data: cats }, { data: cityRows }, { data: rates }] = await Promise.all([
      supabase.from("categories").select("id, name").order("sort_order"),
      supabase.from("cities").select("id, name").order("name"),
      supabase.from("exchange_rates").select("rate_applied").order("date", { ascending: false }).limit(1),
    ]);
    categoryIdByName.current = new Map((cats ?? []).map((c) => [c.name, c.id]));
    cityIdByName.current = new Map((cityRows ?? []).map((c) => [c.name, c.id]));
    setCategories(["Todos", ...(cats ?? []).map((c) => c.name)]);
    setCities((cityRows ?? []).map((c) => c.name));
    setRateApplied(rates?.[0] ? Number(rates[0].rate_applied) : 0);
  }, []);

  // --- Eventos: públicos + (si soy organizador) los míos en cualquier estado ---
  // "organizers!events_organizer_id_fkey": events tiene dos FK hacia
  // organizers (organizer_id y claimed_by), así que hay que decirle a
  // PostgREST cuál usar o el embed falla con "more than one relationship".
  const eventSelect =
    "*, ticket_types(*), categories(name), cities(name), organizers!events_organizer_id_fkey(id, name, plan, verification_status)";

  function mapEventRow(row: any): { event: EventItem; organizer?: Organizer } {
    const images: string[] = row.images ?? [];
    const ticketTypes: TicketType[] = (row.ticket_types ?? []).map((tt: any) => ({
      id: tt.id,
      eventId: tt.event_id,
      name: tt.name,
      priceCents: tt.price_cents,
      quantity: tt.quantity,
      sold: tt.sold,
      reserved: tt.reserved,
      minPerOrder: tt.min_per_order,
      maxPerOrder: tt.max_per_order,
    }));
    const durationMinutes = row.ends_at
      ? Math.max(30, Math.round((new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime()) / 60000))
      : 120;
    const org = row.organizers
      ? {
          id: row.organizers.id,
          name: row.organizers.name,
          verified: row.organizers.verification_status === "verificado",
          plan: row.organizers.plan,
          ratingAvg: 0,
          ratingCount: 0,
        }
      : undefined;
    const event: EventItem = {
      id: row.id,
      organizerId: row.organizer_id ?? "sin-organizador",
      title: row.title,
      kind: row.kind,
      category: row.categories?.name ?? "Otros",
      city: row.cities?.name ?? "Barquisimeto",
      imageLabel: `Foto: ${row.title}`,
      imageUrl: images[0] ?? "",
      description: row.description ?? "",
      venueName: row.venue_name ?? "",
      meetingPoint: row.venue_address ?? undefined,
      lat: row.venue_lat ?? 10.0678,
      lng: row.venue_lng ?? -69.3467,
      startsAt: row.starts_at,
      durationMinutes,
      refundPolicy: row.refund_policy,
      minAge: row.min_age || undefined,
      ratingAvg: 0,
      ratingCount: 0,
      ticketTypes,
      isFeatured: false,
      isFree: ticketTypes.length > 0 && ticketTypes.every((t) => t.priceCents === 0),
      sourceCurated: row.source === "curated",
      status: row.status,
      salesPaused: !!row.sales_paused,
      cancelReason: row.cancelled_reason ?? undefined,
    };
    return { event, organizer: org };
  }

  const fetchEvents = useCallback(async (currentOrganizerId: string | null) => {
    const queries = [supabase.from("events").select(eventSelect).order("starts_at")];
    if (currentOrganizerId) {
      queries.push(supabase.from("events").select(eventSelect).eq("organizer_id", currentOrganizerId));
    }
    const results = await Promise.all(queries);
    const rows = results.flatMap((r) => r.data ?? []);
    const byId = new Map<string, any>();
    for (const row of rows) byId.set(row.id, row);

    const nextEvents: EventItem[] = [];
    const nextOrganizers: Record<string, Organizer> = {};
    for (const row of byId.values()) {
      const { event, organizer } = mapEventRow(row);
      nextEvents.push(event);
      if (organizer) nextOrganizers[organizer.id] = organizer;
    }
    nextEvents.sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1));
    setEvents(nextEvents);
    setOrganizersById((prev) => ({ ...prev, ...nextOrganizers }));
  }, []);

  // --- Perfil de organizador propio -----------------------------------------
  const fetchMyOrganizer = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("organizers")
      .select("id, name, legal_document, verification_status, rejection_reason, payout_method, payout_account, bio, contact_phone, logo_url, plan, commission_rate")
      .eq("owner_user_id", uid)
      .maybeSingle();
    if (data) {
      setMyOrganizerId(data.id);
      setOrganizerStatus(mapOrganizerStatus(data.verification_status));
      setOrganizerProfile({
        name: data.name,
        document: data.legal_document ?? "",
        bio: data.bio ?? undefined,
        phone: data.contact_phone ?? undefined,
        logoUrl: data.logo_url ?? undefined,
        plan: data.plan,
        commissionRate: Number(data.commission_rate),
        rejectionReason: data.rejection_reason ?? undefined,
        payoutMethod: (data.payout_method as PaymentMethod) ?? undefined,
        payoutAccount: data.payout_account ?? undefined,
      });
    } else {
      setMyOrganizerId(null);
      setOrganizerStatus("none");
      setOrganizerProfile(null);
    }
    return data?.id ?? null;
  }, []);

  function mapOrderRow(row: any, payment: any): Order {
    const status: Order["status"] =
      row.status === "partially_refunded" ? "paid" : (row.status as Order["status"]);
    return {
      id: row.id,
      eventId: row.event_id,
      ticketTypeId: row.ticket_type_id,
      quantity: row.quantity,
      status,
      paymentMethod: (payment?.method as PaymentMethod) ?? "pago_movil",
      subtotalCents: row.subtotal_cents,
      serviceFeeCents: row.service_fee_cents,
      totalCents: row.total_usd_cents,
      totalBs: row.total_bs ?? 0,
      rateUsed: row.rate_used ? Number(row.rate_used) : 0,
      commissionCents: row.commission_cents,
      organizerNetCents: row.organizer_net_cents,
      reference: payment?.reference ?? undefined,
      rejectionReason: payment?.rejection_reason ?? undefined,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      paidAt: row.paid_at ?? undefined,
    };
  }

  async function fetchOrdersWithPayments(filterBuilder: any): Promise<Order[]> {
    const { data: orderRows } = await filterBuilder;
    const orderIds = (orderRows ?? []).map((o: any) => o.id);
    const { data: paymentRows } = orderIds.length
      ? await supabase.from("payments").select("*").in("order_id", orderIds).order("created_at", { ascending: false })
      : { data: [] as any[] };
    const latestPaymentByOrder = new Map<string, any>();
    for (const p of paymentRows ?? []) {
      if (!latestPaymentByOrder.has(p.order_id)) latestPaymentByOrder.set(p.order_id, p);
    }
    return (orderRows ?? []).map((row: any) => mapOrderRow(row, latestPaymentByOrder.get(row.id)));
  }

  // --- Órdenes de mis eventos, para el panel de organizador (no las mías como
  // comprador: son cosas distintas, antes se mezclaban por error). ------------
  const fetchOrganizerOrders = useCallback(async (organizerId: string | null, eventIds: string[]) => {
    if (!organizerId || eventIds.length === 0) {
      setOrganizerOrders([]);
      return;
    }
    const rows = await fetchOrdersWithPayments(
      supabase.from("orders").select("*").in("event_id", eventIds).order("created_at", { ascending: false })
    );
    setOrganizerOrders(rows);
  }, []);

  // --- Saldo y retiros del organizador -----------------------------------------
  const fetchBalance = useCallback(async (organizerId: string | null) => {
    if (!organizerId) {
      setBalance({ netPaidCents: 0, withdrawnCents: 0, pendingCents: 0, availableCents: 0 });
      setWithdrawals([]);
      return;
    }
    const [{ data: bal }, { data: wds }] = await Promise.all([
      supabase.from("organizer_balances").select("*").eq("organizer_id", organizerId).maybeSingle(),
      supabase.from("withdrawals").select("*").eq("organizer_id", organizerId).order("requested_at", { ascending: false }),
    ]);
    setBalance({
      netPaidCents: Number(bal?.net_paid_cents ?? 0),
      withdrawnCents: Number(bal?.withdrawn_cents ?? 0),
      pendingCents: Number(bal?.pending_withdrawal_cents ?? 0),
      availableCents: Number(bal?.balance_available_cents ?? 0),
    });
    setWithdrawals(
      (wds ?? []).map((w: any) => ({
        id: w.id,
        amountCents: w.amount_cents,
        method: w.method,
        account: w.reference ?? "",
        status: w.status,
        requestedAt: w.requested_at,
      }))
    );
  }, []);

  // --- Datos para las analíticas del organizador: todas las órdenes y tickets de
  // mis eventos, pedidos por páginas (PostgREST corta cada respuesta en 1000 filas).
  const fetchAnalytics = useCallback(async (eventIds: string[]) => {
    if (eventIds.length === 0) {
      setAnalyticsOrders([]);
      setAnalyticsTickets([]);
      return;
    }
    async function pageAll(table: string, columns: string): Promise<any[]> {
      const rows: any[] = [];
      for (let from = 0; ; from += 1000) {
        const { data } = await supabase
          .from(table)
          .select(columns)
          .in("event_id", eventIds)
          .order("created_at", { ascending: false })
          .range(from, from + 999);
        rows.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      return rows;
    }
    const [orderRows, ticketRows] = await Promise.all([
      pageAll(
        "orders",
        "id, user_id, event_id, ticket_type_id, quantity, status, subtotal_cents, total_usd_cents, commission_cents, organizer_net_cents, currency_paid, discount_cents, is_comp, created_at, paid_at"
      ),
      pageAll("tickets", "id, event_id, ticket_type_id, status, checked_in_at, created_at"),
    ]);
    setAnalyticsOrders(orderRows as OrderRow[]);
    setAnalyticsTickets(ticketRows as TicketRow[]);
  }, []);

  // --- Bandeja de notificaciones (las crean disparadores en la base de datos) ---
  const fetchNotifications = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, body, data, read_at, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(60);
    setNotifications(
      (data ?? []).map((r: any) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        body: r.body,
        data: r.data ?? {},
        readAt: r.read_at ?? undefined,
        createdAt: r.created_at,
      }))
    );
  }, []);

  // --- Cupones del organizador, con cuántas veces se usó cada uno ---------------
  const fetchCoupons = useCallback(async (organizerId: string | null) => {
    if (!organizerId) {
      setCoupons([]);
      return;
    }
    const [{ data: rows }, { data: reds }] = await Promise.all([
      supabase.from("coupons").select("*").eq("organizer_id", organizerId).order("created_at", { ascending: false }),
      supabase.from("coupon_redemptions").select("coupon_id, orders(status)"),
    ]);
    const uses = new Map<string, number>();
    for (const r of reds ?? []) {
      const status = (r as any).orders?.status;
      if (status === "expired" || status === "cancelled") continue;
      uses.set((r as any).coupon_id, (uses.get((r as any).coupon_id) ?? 0) + 1);
    }
    setCoupons(
      (rows ?? []).map((c: any) => ({
        id: c.id,
        code: c.code,
        discountType: c.discount_type,
        discountValue: c.discount_value,
        eventId: c.event_id,
        maxUses: c.max_uses,
        perUserLimit: c.per_user_limit,
        validUntil: c.valid_until ?? undefined,
        active: c.active,
        uses: uses.get(c.id) ?? 0,
      }))
    );
  }, []);

  // --- Equipo de puerta: los que yo agregué (si soy organizador) y los
  // organizadores para los que yo hago puerta.
  const fetchStaff = useCallback(async (uid: string, organizerId: string | null) => {
    const [{ data: mine }, { data: assigned }] = await Promise.all([
      organizerId
        ? supabase.from("organizer_staff").select("id, email, full_name").eq("organizer_id", organizerId).order("created_at")
        : Promise.resolve({ data: [] as any[] }),
      supabase.from("organizer_staff").select("organizer_id, organizers(name)").eq("user_id", uid),
    ]);
    setStaff((mine ?? []).map((r: any) => ({ id: r.id, email: r.email, name: r.full_name || r.email })));
    setStaffAssignments(
      (assigned ?? []).map((r: any) => ({ organizerId: r.organizer_id, organizerName: r.organizers?.name ?? "Organizador" }))
    );
  }, []);

  // --- Datos propios del comprador: órdenes, tickets, favoritos, puntos ------
  const fetchUserData = useCallback(async (uid: string) => {
    const { data: orderRows } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    const orderIds = (orderRows ?? []).map((o) => o.id);

    const [{ data: paymentRows }, { data: ticketRows }, { data: favRows }, { data: remRows }, { data: loyaltyRows }] = await Promise.all([
      orderIds.length
        ? supabase.from("payments").select("*").in("order_id", orderIds).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
      supabase.from("tickets").select("*").eq("user_id", uid),
      supabase.from("favorites").select("event_id").eq("user_id", uid),
      supabase.from("event_reminders").select("event_id").eq("user_id", uid),
      supabase.from("loyalty_entries").select("*").eq("user_id", uid),
    ]);

    const latestPaymentByOrder = new Map<string, any>();
    for (const p of paymentRows ?? []) {
      if (!latestPaymentByOrder.has(p.order_id)) latestPaymentByOrder.set(p.order_id, p);
    }

    setOrders((orderRows ?? []).map((row) => mapOrderRow(row, latestPaymentByOrder.get(row.id))));

    setTickets(
      (ticketRows ?? []).map((row) => ({
        id: row.id,
        code: row.code,
        orderId: row.order_id,
        eventId: row.event_id,
        attendeeName: row.attendee_name ?? "Tú",
        status: row.status === "used" ? "used" : row.status === "valid" ? "valid" : "void",
        checkedInAt: row.checked_in_at ?? undefined,
      }))
    );

    setFavorites((favRows ?? []).map((r) => r.event_id));
    setReminders((remRows ?? []).map((r) => r.event_id));
    setLoyaltyEntries(
      (loyaltyRows ?? []).map((row) => ({
        id: row.id,
        points: row.points,
        reason: row.reason,
        orderId: row.order_id ?? undefined,
        createdAt: row.created_at,
      }))
    );
  }, []);

  // --- Carga inicial + sesión -------------------------------------------------
  useEffect(() => {
    let mounted = true;
    (async () => {
      await fetchCatalog();
      await fetchEvents(null);
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      if (data.session) {
        const orgId = await fetchMyOrganizer(data.session.user.id);
        await Promise.all([fetchUserData(data.session.user.id), fetchEvents(orgId)]);
      }
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        const orgId = await fetchMyOrganizer(newSession.user.id);
        await Promise.all([fetchUserData(newSession.user.id), fetchEvents(orgId)]);
      } else {
        setOrders([]);
        setTickets([]);
        setFavorites([]);
        setReminders([]);
        setLoyaltyEntries([]);
        setOrganizerStatus("none");
        setOrganizerProfile(null);
        setMyOrganizerId(null);
        setOrganizerOrders([]);
        setCoupons([]);
        setNotifications([]);
        setAnalyticsOrders([]);
        setAnalyticsTickets([]);
        setStaff([]);
        setStaffAssignments([]);
        setBalance({ netPaidCents: 0, withdrawnCents: 0, pendingCents: 0, availableCents: 0 });
        setWithdrawals([]);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Tiempo real: refresca cuando cambian mis órdenes/tickets/eventos -----
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`plann-user-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${userId}` }, () => {
        fetchUserData(userId);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets", filter: `user_id=eq.${userId}` }, () => {
        fetchUserData(userId);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchUserData]);

  useEffect(() => {
    const channel = supabase
      .channel("plann-ticket-availability")
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_types" }, () => {
        fetchEvents(myOrganizerId);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [myOrganizerId, fetchEvents]);

  // --- Tiempo real: si un admin aprueba/rechaza mi verificación de
  // organizador, se refleja sola sin tener que cerrar y volver a abrir la app.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`plann-organizer-profile-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "organizers", filter: `owner_user_id=eq.${userId}` },
        () => fetchMyOrganizer(userId)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchMyOrganizer]);

  // --- Órdenes de mis eventos (panel de organizador): se recalculan cuando
  // cambia mi lista de eventos y en tiempo real cuando alguien compra o un
  // pago se aprueba/rechaza.
  const myEventIds = useMemo(
    () => events.filter((e) => e.organizerId === myOrganizerId).map((e) => e.id),
    [events, myOrganizerId]
  );

  useEffect(() => {
    fetchOrganizerOrders(myOrganizerId, myEventIds);
  }, [myOrganizerId, myEventIds, fetchOrganizerOrders]);

  useEffect(() => {
    fetchBalance(myOrganizerId);
  }, [myOrganizerId, organizerOrders, fetchBalance]);

  const myEventIdsKey = myEventIds.join(",");
  useEffect(() => {
    fetchAnalytics(myEventIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myEventIdsKey, fetchAnalytics]);

  useEffect(() => {
    if (userId) fetchStaff(userId, myOrganizerId);
  }, [userId, myOrganizerId, fetchStaff]);

  useEffect(() => {
    fetchCoupons(myOrganizerId);
  }, [myOrganizerId, organizerOrders, fetchCoupons]);

  // Notificaciones: carga inicial, token de push y aviso en vivo cuando llega una nueva.
  useEffect(() => {
    if (!userId) return;
    fetchNotifications(userId);
    registerPushToken(userId);
    const channel = supabase
      .channel(`plann-notifications-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        const n: any = payload.new;
        fetchNotifications(userId);
        presentLocalNotification({ title: n.title, body: n.body, data: { ...(n.data ?? {}), notification_id: n.id } });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`plann-staff-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "organizer_staff" }, () => {
        fetchStaff(userId, myOrganizerId);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, myOrganizerId, fetchStaff]);

  useEffect(() => {
    if (!myOrganizerId) return;
    const channel = supabase
      .channel(`plann-organizer-withdrawals-${myOrganizerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals", filter: `organizer_id=eq.${myOrganizerId}` }, () => {
        fetchBalance(myOrganizerId);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [myOrganizerId, fetchBalance]);

  useEffect(() => {
    if (!myOrganizerId) return;
    const channel = supabase
      .channel(`plann-organizer-orders-${myOrganizerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrganizerOrders(myOrganizerId, myEventIds);
        fetchAnalytics(myEventIds);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [myOrganizerId, myEventIds, fetchOrganizerOrders, fetchAnalytics]);

  // --- Auth -------------------------------------------------------------------
  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (error) return { ok: false, reason: error.message };
    if (data.user) {
      await supabase.from("users").update({ full_name: fullName }).eq("id", data.user.id);
    }
    return { ok: true };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // --- Compra: crear orden (reserva atómica en el servidor) -------------------
  const createOrder = useCallback(
    async (ticketTypeId: string, quantity: number, couponCode?: string): Promise<CreateOrderResult> => {
      const { data, error } = await supabase.rpc("create_order", {
        p_ticket_type_id: ticketTypeId,
        p_quantity: quantity,
        p_idempotency_key: uuidv4(),
        p_coupon_code: couponCode?.trim() || null,
      });
      if (error || !data) {
        const reason = error?.message.includes("sold_out")
          ? "Se agotaron mientras completabas el pago. No te cobramos."
          : dbErrorMessage(error?.message, "No se pudo reservar el ticket. Intenta de nuevo.");
        return { ok: false, reason };
      }
      if (userId) await fetchUserData(userId);
      const row: any = data;
      const order: Order = {
        id: row.id,
        eventId: row.event_id,
        ticketTypeId: row.ticket_type_id,
        quantity: row.quantity,
        status: row.status,
        paymentMethod: "pago_movil",
        subtotalCents: row.subtotal_cents,
        serviceFeeCents: row.service_fee_cents,
        totalCents: row.total_usd_cents,
        totalBs: row.total_bs ?? 0,
        rateUsed: row.rate_used ? Number(row.rate_used) : 0,
        commissionCents: row.commission_cents,
        organizerNetCents: row.organizer_net_cents,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        paidAt: row.paid_at ?? undefined,
      };
      return { ok: true, order };
    },
    [userId, fetchUserData]
  );

  const previewCoupon = useCallback(async (ticketTypeId: string, quantity: number, code: string) => {
    const { data, error } = await supabase.rpc("preview_coupon", { p_ticket_type_id: ticketTypeId, p_quantity: quantity, p_code: code.trim() });
    if (error || !data) return { valid: false, discountCents: 0, reason: "No pudimos revisar el cupón. Intenta de nuevo." };
    const r: any = data;
    if (!r.valid) return { valid: false, discountCents: 0, reason: dbErrorMessage(r.reason, "Ese cupón no es válido.") };
    return { valid: true, discountCents: Number(r.discount_cents) };
  }, []);

  const submitPaymentReference = useCallback(
    async (orderId: string, method: PaymentMethod, reference: string, bank?: string) => {
      const { error } = await supabase.rpc("submit_payment", {
        p_order_id: orderId,
        p_method: method,
        p_reference: reference,
        p_payer_bank: bank,
      });
      if (userId) await fetchUserData(userId);
      if (error) return { ok: false, reason: error.message };
      return { ok: true };
    },
    [userId, fetchUserData]
  );

  const checkIn = useCallback(async (code: string, eventId?: string) => {
    const { data, error } = await supabase.rpc("checkin_ticket", { p_code: code, p_event_id: eventId ?? null });
    if (error || !data) return { status: "invalid" as const };
    const result: any = data;
    return {
      status: result.status as "valid" | "used" | "invalid",
      attendeeName: result.attendee_name ?? undefined,
      checkedInAt: result.checked_in_at ?? undefined,
    };
  }, []);

  const toggleFavorite = useCallback(
    async (eventId: string) => {
      if (!userId) return;
      const isFav = favorites.includes(eventId);
      if (isFav) {
        setFavorites((f) => f.filter((id) => id !== eventId));
        await supabase.from("favorites").delete().eq("user_id", userId).eq("event_id", eventId);
      } else {
        setFavorites((f) => [...f, eventId]);
        await supabase.from("favorites").insert({ user_id: userId, event_id: eventId });
      }
    },
    [userId, favorites]
  );

  const toggleReminder = useCallback(
    async (eventId: string): Promise<boolean> => {
      if (!userId) return false;
      const enabled = reminders.includes(eventId);
      if (enabled) {
        setReminders((r) => r.filter((id) => id !== eventId));
        await supabase.from("event_reminders").delete().eq("user_id", userId).eq("event_id", eventId);
        await cancelEventReminder(eventId);
      } else {
        setReminders((r) => [...r, eventId]);
        await supabase.from("event_reminders").insert({ user_id: userId, event_id: eventId });
        const event = events.find((e) => e.id === eventId);
        if (event) await scheduleEventReminder(event);
      }
      return !enabled;
    },
    [userId, reminders, events]
  );

  const requestOrganizerVerification = useCallback(
    async (name: string, document: string) => {
      if (!userId) return;
      if (myOrganizerId) {
        const { error: retryError } = await supabase
          .from("organizers")
          .update({ name, legal_document: document, verification_status: "pendiente" })
          .eq("id", myOrganizerId);
        if (!retryError) await fetchMyOrganizer(userId);
        return;
      }
      const barquisimetoId = cityIdByName.current.get("Barquisimeto") ?? null;
      const { error } = await supabase.from("organizers").insert({
        owner_user_id: userId,
        name,
        slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 7)}`,
        legal_document: document,
        verification_status: "pendiente",
        plan: "basico",
        commission_rate: 0.12,
        city_id: barquisimetoId,
      });
      if (!error) await fetchMyOrganizer(userId);
    },
    [userId, myOrganizerId, fetchMyOrganizer]
  );

  // Sube la foto elegida al bucket "event-images" y devuelve su URL pública.
  // Si algo falla, el evento igual se crea (con el placeholder de rayas):
  // una foto mala no debería bloquear publicar el evento.
  async function uploadEventImage(imageUri: string, organizerId: string): Promise<string | null> {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const path = `${organizerId}/${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("event-images").upload(path, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });
      if (error) return null;
      const { data } = supabase.storage.from("event-images").getPublicUrl(path);
      return data.publicUrl;
    } catch {
      return null;
    }
  }

  const createEvent = useCallback(
    async (input: NewEventInput): Promise<boolean> => {
      if (!myOrganizerId) return false;
      const categoryId = categoryIdByName.current.get(input.category) ?? null;
      const cityId = cityIdByName.current.get(input.city) ?? cityIdByName.current.get("Barquisimeto") ?? null;
      const endsAt = new Date(new Date(input.startsAt).getTime() + input.durationMinutes * 60000).toISOString();

      const imageUrl = input.imageUri ? await uploadEventImage(input.imageUri, myOrganizerId) : null;

      const { data: eventRow, error } = await supabase
        .from("events")
        .insert({
          organizer_id: myOrganizerId,
          title: input.title,
          slug: `${slugify(input.title)}-${Date.now().toString(36)}`,
          kind: "event",
          category_id: categoryId,
          description: input.description,
          city_id: cityId,
          venue_name: input.venueName,
          venue_address: input.venueAddress || null,
          venue_lat: input.lat ?? null,
          venue_lng: input.lng ?? null,
          images: imageUrl ? [imageUrl] : [],
          starts_at: input.startsAt,
          ends_at: endsAt,
          status: "published",
          refund_policy: "24h",
          min_age: 0,
          source: "organizer",
        })
        .select("id")
        .single();

      if (error || !eventRow) return false;

      await supabase.from("ticket_types").insert(
        input.tickets.map((t) => ({
          event_id: eventRow.id,
          name: t.name,
          price_cents: t.priceCents,
          quantity: t.quantity,
          min_per_order: 1,
          max_per_order: 6,
        }))
      );

      await fetchEvents(myOrganizerId);
      return true;
    },
    [myOrganizerId, fetchEvents]
  );

  const publishEvent = useCallback(
    async (eventId: string): Promise<Result> => {
      const { error } = await supabase.from("events").update({ status: "published" }).eq("id", eventId).eq("status", "draft");
      if (error) return { ok: false, reason: dbErrorMessage(error.message, "No se pudo publicar el evento.") };
      await fetchEvents(myOrganizerId);
      return { ok: true };
    },
    [myOrganizerId, fetchEvents]
  );

  const duplicateEvent = useCallback(
    async (eventId: string): Promise<{ ok: boolean; eventId?: string; reason?: string }> => {
      if (!myOrganizerId) return { ok: false };
      const { data: src } = await supabase
        .from("events")
        .select("title, kind, category_id, city_id, description, images, venue_name, venue_address, venue_lat, venue_lng, starts_at, ends_at, refund_policy, min_age, ticket_types(name, price_cents, quantity, min_per_order, max_per_order)")
        .eq("id", eventId)
        .eq("organizer_id", myOrganizerId)
        .single();
      if (!src) return { ok: false, reason: "No encontramos el evento." };
      const shift = 7 * 24 * 3600 * 1000;
      const { data: copy, error } = await supabase
        .from("events")
        .insert({
          organizer_id: myOrganizerId,
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
      if (error || !copy) return { ok: false, reason: dbErrorMessage(error?.message, "No se pudo duplicar el evento.") };
      const types = (src.ticket_types ?? []) as any[];
      if (types.length > 0) {
        await supabase.from("ticket_types").insert(types.map((t) => ({ ...t, event_id: copy.id })));
      }
      await fetchEvents(myOrganizerId);
      return { ok: true, eventId: copy.id };
    },
    [myOrganizerId, fetchEvents]
  );

  const createCoupon = useCallback(
    async (input: NewCouponInput): Promise<Result> => {
      if (!myOrganizerId) return { ok: false };
      const { error } = await supabase.from("coupons").insert({
        organizer_id: myOrganizerId,
        event_id: input.eventId,
        code: input.code.trim().toUpperCase(),
        discount_type: input.discountType,
        discount_value: input.discountValue,
        max_uses: input.maxUses,
        valid_until: input.validUntil ?? null,
      });
      if (error) {
        const dup = error.code === "23505" || error.message.includes("uq_coupons_code");
        return { ok: false, reason: dup ? "Ya tienes un cupón con ese código." : "No se pudo crear el cupón." };
      }
      await fetchCoupons(myOrganizerId);
      return { ok: true };
    },
    [myOrganizerId, fetchCoupons]
  );

  const setCouponActive = useCallback(
    async (id: string, active: boolean): Promise<Result> => {
      const { error } = await supabase.from("coupons").update({ active }).eq("id", id);
      if (error) return { ok: false, reason: "No se pudo cambiar el cupón." };
      await fetchCoupons(myOrganizerId);
      return { ok: true };
    },
    [myOrganizerId, fetchCoupons]
  );

  const deleteCoupon = useCallback(
    async (id: string): Promise<Result> => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) return { ok: false, reason: "No se pudo eliminar el cupón." };
      await fetchCoupons(myOrganizerId);
      return { ok: true };
    },
    [myOrganizerId, fetchCoupons]
  );

  const issueComp = useCallback(
    async (ticketTypeId: string, email: string, quantity: number, note?: string): Promise<Result> => {
      const { error } = await supabase.rpc("issue_comp_tickets", {
        p_ticket_type_id: ticketTypeId,
        p_email: email.trim(),
        p_quantity: quantity,
        p_note: note?.trim() || null,
      });
      if (error) return { ok: false, reason: dbErrorMessage(error.message, "No se pudo enviar la cortesía.") };
      await fetchEvents(myOrganizerId);
      return { ok: true };
    },
    [myOrganizerId, fetchEvents]
  );

  const sendAnnouncement = useCallback(async (eventId: string, message: string) => {
    const { data, error } = await supabase.rpc("send_event_announcement", { p_event_id: eventId, p_message: message });
    if (error) return { ok: false, reason: dbErrorMessage(error.message, "No se pudo enviar el mensaje.") };
    return { ok: true, recipients: Number(data ?? 0) };
  }, []);

  const markNotificationsRead = useCallback(
    async (ids?: string[]) => {
      if (!userId) return;
      const now = new Date().toISOString();
      setNotifications((list) => list.map((n) => (!n.readAt && (!ids || ids.includes(n.id)) ? { ...n, readAt: now } : n)));
      let query = supabase.from("notifications").update({ read_at: now }).eq("user_id", userId).is("read_at", null);
      if (ids) query = query.in("id", ids);
      await query;
    },
    [userId]
  );

  const unreadCount = useMemo(() => notifications.filter((n) => !n.readAt).length, [notifications]);

  const updateOrganizerProfile = useCallback(
    async (input: OrganizerProfileInput): Promise<Result> => {
      if (!myOrganizerId || !userId) return { ok: false };
      const update: Record<string, unknown> = {
        name: input.name,
        bio: input.bio || null,
        contact_phone: input.phone || null,
        updated_at: new Date().toISOString(),
      };
      if (input.payoutMethod) {
        update.payout_method = input.payoutMethod;
        update.payout_account = input.payoutAccount || null;
      }
      if (input.logoUri) {
        const url = await uploadEventImage(input.logoUri, myOrganizerId);
        if (url) update.logo_url = url;
      }
      const { error } = await supabase.from("organizers").update(update).eq("id", myOrganizerId);
      if (error) return { ok: false, reason: "No se pudo guardar tu perfil." };
      await fetchMyOrganizer(userId);
      return { ok: true };
    },
    [myOrganizerId, userId, fetchMyOrganizer]
  );

  const updateEvent = useCallback(
    async (eventId: string, input: EventEditInput): Promise<Result> => {
      const update: Record<string, unknown> = {
        title: input.title,
        description: input.description,
        venue_name: input.venueName,
        venue_address: input.venueAddress || null,
        starts_at: input.startsAt,
        updated_at: new Date().toISOString(),
      };
      if (input.lat !== undefined && input.lng !== undefined) {
        update.venue_lat = input.lat;
        update.venue_lng = input.lng;
      }
      if (input.category) update.category_id = categoryIdByName.current.get(input.category) ?? null;
      if (input.city) update.city_id = cityIdByName.current.get(input.city) ?? null;
      if (input.imageUri && myOrganizerId) {
        const url = await uploadEventImage(input.imageUri, myOrganizerId);
        if (!url) return { ok: false, reason: "No se pudo subir la foto. Intenta de nuevo." };
        update.images = [url];
      }
      const { error } = await supabase.from("events").update(update).eq("id", eventId);
      if (error) return { ok: false, reason: dbErrorMessage(error.message, "No se pudo guardar. Intenta de nuevo.") };
      await fetchEvents(myOrganizerId);
      return { ok: true };
    },
    [myOrganizerId, fetchEvents]
  );

  const updateTicketType = useCallback(
    async (ticketTypeId: string, name: string, priceCents: number, quantity: number): Promise<Result> => {
      const { error } = await supabase
        .from("ticket_types")
        .update({ name, price_cents: priceCents, quantity, updated_at: new Date().toISOString() })
        .eq("id", ticketTypeId);
      if (error) return { ok: false, reason: dbErrorMessage(error.message, "No se pudo guardar la entrada.") };
      await fetchEvents(myOrganizerId);
      return { ok: true };
    },
    [myOrganizerId, fetchEvents]
  );

  const addTicketType = useCallback(
    async (eventId: string, ticket: NewTicketInput): Promise<Result> => {
      const { error } = await supabase.from("ticket_types").insert({
        event_id: eventId,
        name: ticket.name,
        price_cents: ticket.priceCents,
        quantity: ticket.quantity,
        min_per_order: 1,
        max_per_order: 6,
      });
      if (error) return { ok: false, reason: dbErrorMessage(error.message, "No se pudo agregar la entrada.") };
      await fetchEvents(myOrganizerId);
      return { ok: true };
    },
    [myOrganizerId, fetchEvents]
  );

  const deleteTicketType = useCallback(
    async (ticketTypeId: string): Promise<Result> => {
      const { error } = await supabase.from("ticket_types").delete().eq("id", ticketTypeId);
      if (error) {
        const hasOrders = error.message.includes("foreign key") || error.code === "23503";
        return {
          ok: false,
          reason: hasOrders ? "Esta entrada ya tiene compras. Ponle cupo igual a lo vendido para cerrarla." : "No se pudo eliminar la entrada.",
        };
      }
      await fetchEvents(myOrganizerId);
      return { ok: true };
    },
    [myOrganizerId, fetchEvents]
  );

  const addStaff = useCallback(
    async (email: string): Promise<Result> => {
      const { error } = await supabase.rpc("add_door_staff", { p_email: email });
      if (error) return { ok: false, reason: dbErrorMessage(error.message, "No se pudo agregar a esa persona.") };
      if (userId) await fetchStaff(userId, myOrganizerId);
      return { ok: true };
    },
    [userId, myOrganizerId, fetchStaff]
  );

  const removeStaff = useCallback(
    async (staffId: string): Promise<Result> => {
      const { error } = await supabase.rpc("remove_door_staff", { p_staff_id: staffId });
      if (error) return { ok: false, reason: "No se pudo quitar a esa persona." };
      if (userId) await fetchStaff(userId, myOrganizerId);
      return { ok: true };
    },
    [userId, myOrganizerId, fetchStaff]
  );

  const fetchAttendees = useCallback(async (eventId: string): Promise<Attendee[]> => {
    const { data, error } = await supabase.rpc("list_event_attendees", { p_event_id: eventId });
    if (error) return [];
    return ((data as any[]) ?? []).map((r) => ({
      ticketId: r.ticket_id,
      code: r.code,
      name: r.attendee_name,
      ticketTypeName: r.ticket_type_name,
      status: r.status,
      checkedInAt: r.checked_in_at ?? undefined,
      totalCents: r.total_usd_cents,
    }));
  }, []);

  const fetchCheckinCounts = useCallback(async (eventId: string) => {
    const { data, error } = await supabase.rpc("event_checkin_counts", { p_event_id: eventId });
    if (error || !data) return null;
    const r: any = data;
    return { total: Number(r.total), used: Number(r.used) };
  }, []);

  const setSalesPaused = useCallback(
    async (eventId: string, paused: boolean): Promise<Result> => {
      const { error } = await supabase.from("events").update({ sales_paused: paused }).eq("id", eventId);
      if (error) return { ok: false, reason: dbErrorMessage(error.message, "No se pudo cambiar el estado de las ventas.") };
      await fetchEvents(myOrganizerId);
      return { ok: true };
    },
    [myOrganizerId, fetchEvents]
  );

  const cancelEvent = useCallback(
    async (eventId: string, reason: string) => {
      const { data, error } = await supabase.rpc("cancel_event", { p_event_id: eventId, p_reason: reason });
      if (error) return { ok: false, reason: dbErrorMessage(error.message, "No se pudo cancelar el evento.") };
      await fetchEvents(myOrganizerId);
      await fetchOrganizerOrders(myOrganizerId, myEventIds);
      return { ok: true, refunds: Number(data ?? 0) };
    },
    [myOrganizerId, myEventIds, fetchEvents, fetchOrganizerOrders]
  );

  const requestWithdrawal = useCallback(
    async (amountCents: number, method: PaymentMethod, account: string): Promise<Result> => {
      const { error } = await supabase.rpc("request_withdrawal", {
        p_amount_cents: amountCents,
        p_method: method,
        p_account: account,
      });
      if (error) return { ok: false, reason: dbErrorMessage(error.message, "No se pudo solicitar el retiro.") };
      await fetchBalance(myOrganizerId);
      if (userId) await fetchMyOrganizer(userId);
      return { ok: true };
    },
    [myOrganizerId, userId, fetchBalance, fetchMyOrganizer]
  );

  const ticketsForOrder = useCallback((orderId: string) => tickets.filter((t) => t.orderId === orderId), [tickets]);

  const getOrganizer = useCallback((id: string | null | undefined) => (id ? organizersById[id] : undefined), [organizersById]);

  const points = useMemo(() => loyaltyEntries.reduce((sum, e) => sum + e.points, 0), [loyaltyEntries]);
  const tier = useMemo(() => getTierForPoints(points), [points]);

  const value = useMemo<AppStoreValue>(
    () => ({
      loading,
      isSignedIn: !!session,
      userEmail: session?.user.email ?? null,
      events,
      categories,
      cities,
      orders,
      organizerOrders,
      tickets,
      favorites,
      reminders,
      loyaltyEntries,
      organizerStatus,
      organizerProfile,
      myOrganizerId,
      balance,
      withdrawals,
      analyticsOrders,
      analyticsTickets,
      notifications,
      unreadCount,
      markNotificationsRead,
      staff,
      staffAssignments,
      coupons,
      createCoupon,
      setCouponActive,
      deleteCoupon,
      issueComp,
      sendAnnouncement,
      rateApplied,
      points,
      tier,
      signUp,
      signIn,
      signOut,
      createOrder,
      previewCoupon,
      submitPaymentReference,
      checkIn,
      toggleFavorite,
      toggleReminder,
      requestOrganizerVerification,
      createEvent,
      updateEvent,
      publishEvent,
      duplicateEvent,
      updateOrganizerProfile,
      updateTicketType,
      addTicketType,
      deleteTicketType,
      addStaff,
      removeStaff,
      fetchAttendees,
      fetchCheckinCounts,
      setSalesPaused,
      cancelEvent,
      requestWithdrawal,
      ticketsForOrder,
      getOrganizer,
    }),
    [
      loading,
      session,
      events,
      categories,
      cities,
      orders,
      organizerOrders,
      tickets,
      favorites,
      reminders,
      loyaltyEntries,
      organizerStatus,
      organizerProfile,
      myOrganizerId,
      balance,
      withdrawals,
      analyticsOrders,
      analyticsTickets,
      notifications,
      unreadCount,
      markNotificationsRead,
      staff,
      staffAssignments,
      coupons,
      createCoupon,
      setCouponActive,
      deleteCoupon,
      issueComp,
      sendAnnouncement,
      rateApplied,
      points,
      tier,
      signUp,
      signIn,
      signOut,
      createOrder,
      previewCoupon,
      submitPaymentReference,
      checkIn,
      toggleFavorite,
      toggleReminder,
      requestOrganizerVerification,
      createEvent,
      updateEvent,
      publishEvent,
      duplicateEvent,
      updateOrganizerProfile,
      updateTicketType,
      addTicketType,
      deleteTicketType,
      addStaff,
      removeStaff,
      fetchAttendees,
      fetchCheckinCounts,
      setSalesPaused,
      cancelEvent,
      requestWithdrawal,
      ticketsForOrder,
      getOrganizer,
    ]
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore debe usarse dentro de AppStoreProvider");
  return ctx;
}

export function useEvent(eventId: string | undefined): EventItem | undefined {
  const { events } = useAppStore();
  return events.find((e) => e.id === eventId);
}

export { FIRST_PURCHASE_BONUS };
