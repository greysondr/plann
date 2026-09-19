// Analíticas del organizador. Funciones puras (sin acceso a datos) para poder
// probarlas. Los días se cuentan en hora de Venezuela (UTC-4), no en UTC: una
// venta a las 9 pm del lunes no debe caer en el martes.

export interface OrderRow {
  id: string;
  user_id: string;
  event_id: string;
  ticket_type_id: string;
  quantity: number;
  status: string;
  subtotal_cents: number;
  total_usd_cents: number;
  commission_cents: number;
  organizer_net_cents: number;
  currency_paid: string | null;
  discount_cents?: number;
  is_comp?: boolean;
  created_at: string;
  paid_at: string | null;
}

export interface TicketRow {
  id: string;
  event_id: string;
  ticket_type_id: string;
  status: string;
  checked_in_at: string | null;
}

const VE_OFFSET_MS = -4 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;

export function dayKey(iso: string | number | Date): string {
  const t = iso instanceof Date ? iso.getTime() : typeof iso === "number" ? iso : new Date(iso).getTime();
  return new Date(t + VE_OFFSET_MS).toISOString().slice(0, 10);
}

const saleDate = (o: OrderRow) => o.paid_at ?? o.created_at;
// Una cortesía ocupa cupo y emite tickets, pero no es una venta.
export const isPaid = (o: OrderRow) => o.status === "paid" && !o.is_comp;

export interface DayPoint {
  date: string;
  label: string;
  netCents: number;
  tickets: number;
  orders: number;
}

const dayLabel = (key: string) => {
  const [, m, d] = key.split("-");
  return `${Number(d)}/${Number(m)}`;
};

// Últimos `days` días terminando en `now`, con ceros en los días sin ventas.
export function dailySeries(orders: OrderRow[], days: number, now: Date = new Date()): DayPoint[] {
  const points = new Map<string, DayPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(now.getTime() - i * DAY_MS);
    points.set(key, { date: key, label: dayLabel(key), netCents: 0, tickets: 0, orders: 0 });
  }
  for (const o of orders) {
    if (!isPaid(o)) continue;
    const p = points.get(dayKey(saleDate(o)));
    if (!p) continue;
    p.netCents += o.organizer_net_cents;
    p.tickets += o.quantity;
    p.orders += 1;
  }
  return [...points.values()];
}

export interface Totals {
  netCents: number;
  grossCents: number;
  tickets: number;
  orders: number;
}

// Totales de ventas pagadas entre [from, to) (fechas de la venta).
export function totalsBetween(orders: OrderRow[], from: Date, to: Date): Totals {
  const t: Totals = { netCents: 0, grossCents: 0, tickets: 0, orders: 0 };
  for (const o of orders) {
    if (!isPaid(o)) continue;
    const at = new Date(saleDate(o)).getTime();
    if (at < from.getTime() || at >= to.getTime()) continue;
    t.netCents += o.organizer_net_cents;
    t.grossCents += o.subtotal_cents;
    t.tickets += o.quantity;
    t.orders += 1;
  }
  return t;
}

// Variación porcentual; null si no hay base para comparar.
export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}

export interface Slice {
  id: string;
  name: string;
  netCents: number;
  tickets: number;
}

export function sumBy(orders: OrderRow[], key: (o: OrderRow) => string, names: Map<string, string>): Slice[] {
  const map = new Map<string, Slice>();
  for (const o of orders) {
    if (!isPaid(o)) continue;
    const id = key(o);
    const s = map.get(id) ?? { id, name: names.get(id) ?? id, netCents: 0, tickets: 0 };
    s.netCents += o.organizer_net_cents;
    s.tickets += o.quantity;
    map.set(id, s);
  }
  return [...map.values()].sort((a, b) => b.netCents - a.netCents);
}

export interface Funnel {
  total: number;
  paid: number;
  pending: number;
  expired: number;
  cancelled: number;
  refunded: number;
  conversion: number;
}

export function funnel(allOrders: OrderRow[]): Funnel {
  const orders = allOrders.filter((o) => !o.is_comp);
  const f: Funnel = { total: orders.length, paid: 0, pending: 0, expired: 0, cancelled: 0, refunded: 0, conversion: 0 };
  for (const o of orders) {
    if (o.status === "paid") f.paid += 1;
    else if (o.status === "pending_payment" || o.status === "in_verification") f.pending += 1;
    else if (o.status === "expired") f.expired += 1;
    else if (o.status === "cancelled") f.cancelled += 1;
    else if (o.status === "refund_pending" || o.status === "refunded" || o.status === "partially_refunded") f.refunded += 1;
  }
  // Conversión sobre los pedidos ya resueltos: un pedido pendiente aún puede pagarse.
  const resolved = f.total - f.pending;
  f.conversion = resolved > 0 ? f.paid / resolved : 0;
  return f;
}

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function weekdayDistribution(orders: OrderRow[]): { label: string; tickets: number }[] {
  const counts = new Array(7).fill(0);
  for (const o of orders) {
    if (!isPaid(o)) continue;
    const key = dayKey(saleDate(o));
    counts[new Date(`${key}T12:00:00Z`).getUTCDay()] += o.quantity;
  }
  // Semana que empieza el lunes.
  return [1, 2, 3, 4, 5, 6, 0].map((d) => ({ label: WEEKDAYS[d], tickets: counts[d] }));
}

export function buyerStats(orders: OrderRow[]): { buyers: number; repeatBuyers: number; repeatRate: number } {
  const perBuyer = new Map<string, number>();
  for (const o of orders) {
    if (!isPaid(o)) continue;
    perBuyer.set(o.user_id, (perBuyer.get(o.user_id) ?? 0) + 1);
  }
  const buyers = perBuyer.size;
  const repeatBuyers = [...perBuyer.values()].filter((n) => n > 1).length;
  return { buyers, repeatBuyers, repeatRate: buyers > 0 ? repeatBuyers / buyers : 0 };
}

export function currencySplit(orders: OrderRow[]): { usd: number; bs: number } {
  let usd = 0;
  let bs = 0;
  for (const o of orders) {
    if (!isPaid(o)) continue;
    if (o.currency_paid === "bs") bs += o.total_usd_cents;
    else usd += o.total_usd_cents;
  }
  return { usd, bs };
}

// Tickets vendidos acumulados por día desde la primera venta hasta `until`.
export function cumulativeTickets(orders: OrderRow[], until: Date = new Date()): { date: string; label: string; tickets: number }[] {
  const paid = orders.filter(isPaid);
  if (paid.length === 0) return [];
  const perDay = new Map<string, number>();
  let first = Infinity;
  for (const o of paid) {
    const t = new Date(saleDate(o)).getTime();
    first = Math.min(first, t);
    const k = dayKey(t);
    perDay.set(k, (perDay.get(k) ?? 0) + o.quantity);
  }
  const out: { date: string; label: string; tickets: number }[] = [];
  let running = 0;
  const lastKey = dayKey(until);
  for (let t = new Date(dayKey(first) + "T12:00:00Z").getTime(); ; t += DAY_MS) {
    const key = new Date(t).toISOString().slice(0, 10);
    if (key > lastKey) break;
    running += perDay.get(key) ?? 0;
    out.push({ date: key, label: dayLabel(key), tickets: running });
  }
  return out;
}

export interface Attendance {
  issued: number;
  used: number;
  rate: number;
}

export function attendance(tickets: TicketRow[]): Attendance {
  let issued = 0;
  let used = 0;
  for (const t of tickets) {
    if (t.status === "valid" || t.status === "used") issued += 1;
    if (t.status === "used") used += 1;
  }
  return { issued, used, rate: issued > 0 ? used / issued : 0 };
}

// Entradas validadas por hora (hora de Venezuela). Se agrupa por hora absoluta y no
// por hora del día, para que una fiesta que cruza la medianoche no estire el eje.
export function checkinsByHour(tickets: TicketRow[]): { label: string; count: number }[] {
  const counts = new Map<number, number>();
  for (const t of tickets) {
    if (t.status !== "used" || !t.checked_in_at) continue;
    const bucket = Math.floor((new Date(t.checked_in_at).getTime() + VE_OFFSET_MS) / 3600000);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  if (counts.size === 0) return [];
  const buckets = [...counts.keys()];
  const min = Math.min(...buckets);
  const max = Math.max(...buckets);
  const out: { label: string; count: number }[] = [];
  for (let b = min; b <= max; b++) {
    const h = ((b % 24) + 24) % 24;
    out.push({ label: `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? " am" : " pm"}`, count: counts.get(b) ?? 0 });
  }
  return out;
}

export interface MonthRow {
  month: string; // YYYY-MM
  label: string;
  tickets: number;
  grossCents: number;
  commissionCents: number;
  netCents: number;
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Resumen mensual de ventas pagadas (más reciente primero).
export function monthlySummary(orders: OrderRow[]): MonthRow[] {
  const map = new Map<string, MonthRow>();
  for (const o of orders) {
    if (!isPaid(o)) continue;
    const month = dayKey(saleDate(o)).slice(0, 7);
    const row = map.get(month) ?? {
      month,
      label: `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`,
      tickets: 0,
      grossCents: 0,
      commissionCents: 0,
      netCents: 0,
    };
    row.tickets += o.quantity;
    row.grossCents += o.subtotal_cents;
    row.commissionCents += o.commission_cents;
    row.netCents += o.organizer_net_cents;
    map.set(month, row);
  }
  return [...map.values()].sort((a, b) => (a.month < b.month ? 1 : -1));
}

// ---------------------------------------------------------------------------
// Liquidación por evento (PLANN-PROYECTO.md 6.6: bruto, comisión, reembolsos, neto)
// ---------------------------------------------------------------------------

export interface EventSettlement {
  eventId: string;
  tickets: number;
  grossCents: number; // a precio de lista, antes de cupones
  discountCents: number;
  commissionCents: number;
  netCents: number; // lo que le queda al organizador de las ventas vigentes
  refundedCents: number; // neto de compras reembolsadas o por reembolsar (ya fuera del saldo)
  refundedOrders: number;
}

export function eventSettlements(orders: OrderRow[]): Map<string, EventSettlement> {
  const map = new Map<string, EventSettlement>();
  const get = (id: string) => {
    let s = map.get(id);
    if (!s) {
      s = { eventId: id, tickets: 0, grossCents: 0, discountCents: 0, commissionCents: 0, netCents: 0, refundedCents: 0, refundedOrders: 0 };
      map.set(id, s);
    }
    return s;
  };
  for (const o of orders) {
    if (o.is_comp) continue;
    if (o.status === "paid") {
      const s = get(o.event_id);
      s.tickets += o.quantity;
      s.grossCents += o.subtotal_cents + (o.discount_cents ?? 0);
      s.discountCents += o.discount_cents ?? 0;
      s.commissionCents += o.commission_cents;
      s.netCents += o.organizer_net_cents;
    } else if (o.status === "refund_pending" || o.status === "refunded") {
      const s = get(o.event_id);
      s.refundedCents += o.organizer_net_cents;
      s.refundedOrders += 1;
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Visitas
// ---------------------------------------------------------------------------

export interface ViewRow {
  event_id: string;
  day: string; // YYYY-MM-DD (hora de Venezuela)
  views: number;
}

export function totalViews(views: ViewRow[], eventId?: string): number {
  return views.filter((v) => !eventId || v.event_id === eventId).reduce((s, v) => s + v.views, 0);
}

// Visitas por día, con ceros, para los últimos `days` días.
export function viewsSeries(views: ViewRow[], days: number, now: Date = new Date(), eventId?: string): { date: string; label: string; views: number }[] {
  const byDay = new Map<string, number>();
  for (const v of views) {
    if (eventId && v.event_id !== eventId) continue;
    byDay.set(v.day, (byDay.get(v.day) ?? 0) + v.views);
  }
  const out: { date: string; label: string; views: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(now.getTime() - i * DAY_MS);
    out.push({ date: key, label: dayLabel(key), views: byDay.get(key) ?? 0 });
  }
  return out;
}

// De cada 100 visitas, cuántas terminan en una compra pagada. null si no hay visitas.
export function viewToPurchaseRate(paidOrders: number, views: number): number | null {
  return views > 0 ? Math.min(1, paidOrders / views) : null;
}

// ---------------------------------------------------------------------------
// Comparar eventos
// ---------------------------------------------------------------------------

export interface CompareRow {
  eventId: string;
  title: string;
  startsAt: string;
  status: string;
  netCents: number;
  tickets: number;
  capacity: number;
  sellThrough: number;
  avgTicketCents: number;
  conversion: number;
  attendanceRate: number | null;
  views: number;
  viewToPurchase: number | null;
}

export function compareEvents(
  events: { id: string; title: string; starts_at: string; status: string; capacity: number }[],
  orders: OrderRow[],
  tickets: TicketRow[],
  views: ViewRow[]
): CompareRow[] {
  const settle = eventSettlements(orders);
  return events.map((e) => {
    const s = settle.get(e.id);
    const evOrders = orders.filter((o) => o.event_id === e.id);
    const att = attendance(tickets.filter((t) => t.event_id === e.id));
    const paid = evOrders.filter(isPaid).length;
    const v = totalViews(views, e.id);
    return {
      eventId: e.id,
      title: e.title,
      startsAt: e.starts_at,
      status: e.status,
      netCents: s?.netCents ?? 0,
      tickets: s?.tickets ?? 0,
      capacity: e.capacity,
      sellThrough: e.capacity > 0 ? (s?.tickets ?? 0) / e.capacity : 0,
      avgTicketCents: s && s.tickets > 0 ? Math.round((s.grossCents - s.discountCents) / s.tickets) : 0,
      conversion: funnel(evOrders).conversion,
      attendanceRate: att.issued > 0 && att.used > 0 ? att.rate : null,
      views: v,
      viewToPurchase: viewToPurchaseRate(paid, v),
    };
  });
}
