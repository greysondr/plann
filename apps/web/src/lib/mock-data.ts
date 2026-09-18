// Dataset simulado del negocio completo (sección 26: MVP con datos de
// prueba, sin backend real todavía — el mismo enfoque que apps/mobile).
// Todo se genera una sola vez, con un PRNG con semilla fija, para que el
// dashboard muestre siempre los mismos números entre el server y el cliente.
import type {
  AuditLogEntry,
  BcvRatePoint,
  Buyer,
  Category,
  City,
  EventItem,
  EventStatus,
  Order,
  OrderStatus,
  Organizer,
  OrganizerPlan,
  OrganizerVerification,
  PaymentMethod,
  SupportTicket,
  WithdrawalRequest,
} from "./types";

// --- PRNG determinista (mulberry32) ---------------------------------------
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260916);
const rand = () => rng();
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
function pick<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)];
}
function weighted<T>(entries: [T, number][]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [value, w] of entries) {
    r -= w;
    if (r <= 0) return value;
  }
  return entries[entries.length - 1][0];
}
function daysAgo(n: number, hour = 12, minute = 0): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}
function inDays(n: number, hour = 20): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const CITIES: City[] = ["Barquisimeto", "Cabudare", "Quíbor", "Cubiro", "Yacambú", "El Tocuyo"];
export const CATEGORIES: Category[] = [
  "Conciertos",
  "Fiestas",
  "Tours",
  "Deportes",
  "Familia",
  "Teatro",
  "Gastronomía",
  "Ferias",
];
const PAYMENT_METHODS: PaymentMethod[] = ["pago_movil", "transferencia", "zelle"];
const BANKS = ["Banesco", "Mercantil", "Venezuela", "BNC", "Provincial"];
const COMMISSION_BY_PLAN: Record<OrganizerPlan, number> = { basico: 0.12, pro: 0.09, business: 0.07 };

const FIRST_NAMES = [
  "María", "José", "Carlos", "Ana", "Luis", "Gabriela", "Pedro", "Valentina", "Miguel", "Camila",
  "Andrés", "Daniela", "Rafael", "Fernanda", "Diego", "Isabella", "Jesús", "Mariana", "Antonio", "Paola",
  "Eduardo", "Génesis", "Ricardo", "Adriana", "Manuel", "Victoria", "Francisco", "Estefanía", "Julio", "Carolina",
];
const LAST_NAMES = [
  "Pérez", "González", "Rodríguez", "Silva", "Torres", "Ramírez", "Flores", "Suárez", "Mendoza", "Castillo",
  "Rivas", "Herrera", "Peña", "Vargas", "Jiménez", "Morales", "Delgado", "Ortiz", "Guerrero", "Salazar",
];
function personName(): string {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}
function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// --- Organizadores ----------------------------------------------------------
const ORGANIZER_SEED: { name: string; plan: OrganizerPlan; verification: OrganizerVerification; city: City }[] = [
  { name: "Bararida Live", plan: "pro", verification: "verificado", city: "Barquisimeto" },
  { name: "Terepaima Tours", plan: "basico", verification: "verificado", city: "Cabudare" },
  { name: "Teatro Juárez", plan: "business", verification: "verificado", city: "Barquisimeto" },
  { name: "Plann Experiencias", plan: "business", verification: "verificado", city: "Barquisimeto" },
  { name: "Rumba Lara Producciones", plan: "pro", verification: "verificado", city: "Cabudare" },
  { name: "Sabores del Centro", plan: "basico", verification: "verificado", city: "Barquisimeto" },
  { name: "Aventura Yacambú", plan: "basico", verification: "pendiente", city: "Yacambú" },
  { name: "Estudio Quíbor Arte", plan: "basico", verification: "pendiente", city: "Quíbor" },
  { name: "Fiestas El Tocuyo", plan: "basico", verification: "rechazado", city: "El Tocuyo" },
  { name: "Nightlife 23", plan: "pro", verification: "suspendido", city: "Barquisimeto" },
];

export const organizers: Organizer[] = ORGANIZER_SEED.map((seed, idx) => {
  const refundRatePct = seed.verification === "suspendido" ? randInt(18, 28) : randInt(1, 9);
  const balanceAvailableCents = seed.verification === "verificado" ? randInt(0, 480000) : 0;
  const balancePendingCents = seed.verification === "verificado" ? randInt(0, 220000) : 0;
  return {
    id: `org-${slug(seed.name)}`,
    name: seed.name,
    legalName: `${seed.name}, C.A.`,
    documentId: `J-${randInt(300000000, 499999999)}-${randInt(0, 9)}`,
    email: `${slug(seed.name)}@plann.app`,
    phone: `0414-${randInt(1000000, 9999999)}`,
    city: seed.city,
    plan: seed.plan,
    verification: seed.verification,
    ratingAvg: seed.verification === "rechazado" ? 0 : Math.round((3.6 + rand() * 1.4) * 10) / 10,
    ratingCount: seed.verification === "verificado" ? randInt(30, 260) : randInt(0, 12),
    refundRatePct,
    reportsCount: seed.verification === "suspendido" ? randInt(3, 9) : randInt(0, 2),
    createdAt: daysAgo(randInt(40, 400)),
    balanceAvailableCents,
    balancePendingCents,
    notes:
      seed.verification === "suspendido"
        ? [
            {
              id: `note-${idx}-1`,
              author: "Grey (superadmin)",
              text: "Suspendido por tasa de reembolso alta y reportes de asistentes. En revisión.",
              createdAt: daysAgo(6),
            },
          ]
        : [],
  };
});
const verifiedOrganizers = organizers.filter((o) => o.verification === "verificado");

// --- Eventos -----------------------------------------------------------------
const EVENT_TITLES: { title: string; category: Category }[] = [
  { title: "Noche Bararida: reguetón y guaracha", category: "Fiestas" },
  { title: "Amanecer en Cubiro + desayuno criollo", category: "Tours" },
  { title: "Don Quijote — función única", category: "Teatro" },
  { title: "Yacambú: cascada y almuerzo en posada", category: "Tours" },
  { title: "Torneo relámpago de fútbol 5", category: "Deportes" },
  { title: "Feria gastronómica del centro", category: "Gastronomía" },
  { title: "Concierto acústico bajo las estrellas", category: "Conciertos" },
  { title: "Fiesta de disfraces Halloween", category: "Fiestas" },
  { title: "Ruta de senderismo Terepaima", category: "Tours" },
  { title: "Feria artesanal de Quíbor", category: "Ferias" },
  { title: "Noche de comedia stand-up", category: "Teatro" },
  { title: "Día familiar en el parque", category: "Familia" },
  { title: "Maratón nocturna 10K", category: "Deportes" },
  { title: "Cata de vinos y quesos", category: "Gastronomía" },
  { title: "Festival de música urbana", category: "Conciertos" },
  { title: "Bazar navideño", category: "Ferias" },
  { title: "Obra infantil: el mago de Lara", category: "Familia" },
  { title: "Rumba retro años 80 y 90", category: "Fiestas" },
  { title: "Tour fotográfico El Tocuyo colonial", category: "Tours" },
  { title: "Torneo de dominó por equipos", category: "Deportes" },
];
const EVENT_STATUS_WEIGHTS: [EventStatus, number][] = [
  ["publicado", 62],
  ["en_revision", 12],
  ["borrador", 10],
  ["pausado", 8],
  ["cancelado", 8],
];

export const events: EventItem[] = Array.from({ length: 42 }).map((_, i) => {
  const seed = EVENT_TITLES[i % EVENT_TITLES.length];
  const organizer = pick(organizers);
  const status = organizer.verification !== "verificado" ? pick<EventStatus>(["borrador", "en_revision"]) : weighted(EVENT_STATUS_WEIGHTS);
  const capacity = randInt(30, 600);
  const soldPct = status === "publicado" ? rand() * 0.95 : status === "cancelado" ? rand() * 0.3 : 0;
  const sold = Math.round(capacity * soldPct);
  const priceFromCents = randInt(3, 60) * 100;
  const isPast = rand() < 0.35;
  return {
    id: `evt-${slug(seed.title)}-${i}`,
    organizerId: organizer.id,
    title: i < EVENT_TITLES.length ? seed.title : `${seed.title} #${Math.floor(i / EVENT_TITLES.length) + 1}`,
    category: seed.category,
    city: organizer.city,
    status,
    startsAt: isPast ? daysAgo(randInt(1, 55), 20) : inDays(randInt(1, 60), pick([15, 19, 20, 21])),
    priceFromCents,
    capacity,
    sold,
    revenueCents: sold * priceFromCents,
    ratingAvg: sold > 5 ? Math.round((3.8 + rand() * 1.2) * 10) / 10 : 0,
    reportsCount: status === "cancelado" ? randInt(0, 3) : rand() < 0.08 ? 1 : 0,
    isFeatured: status === "publicado" && rand() < 0.15,
    createdAt: daysAgo(randInt(1, 70)),
  };
});
const publishedEvents = events.filter((e) => e.status === "publicado" || e.status === "cancelado");

// --- Compradores ---------------------------------------------------------------
export const buyers: Buyer[] = Array.from({ length: 160 }).map((_, i) => {
  const name = personName();
  const ordersCount = weighted<number>([
    [0, 20],
    [1, 30],
    [2, 22],
    [3, 12],
    [4, 8],
    [randInt(5, 14), 8],
  ]);
  return {
    id: `usr-${i.toString().padStart(4, "0")}`,
    name,
    email: `${slug(name)}${i}@correo.com`,
    phone: `04${pick(["12", "14", "16", "24", "26"])}-${randInt(1000000, 9999999)}`,
    documentId: `V-${randInt(8000000, 29999999)}`,
    city: pick(CITIES),
    createdAt: daysAgo(randInt(1, 380)),
    ordersCount,
    paidOrdersCount: Math.max(0, ordersCount - (rand() < 0.15 ? 1 : 0)),
    totalSpentCents: 0, // se completa abajo tras generar órdenes
    pointsBalance: 0,
    tier: "explorador",
    devicesCount: randInt(1, 2),
    flagged: rand() < 0.02,
    notes: [],
  };
});

// --- Órdenes (60 días de actividad) --------------------------------------------
// Los estados transitorios (en_verificacion, pendiente_pago) solo tienen
// sentido para órdenes de hoy: en la vida real se resuelven en minutos u
// horas, nunca quedan "colgadas" semanas — si no, la cola de verificación
// del dashboard mostraría cientos de pagos viejos que ya deberían haberse
// resuelto, en vez de una cola creíble del día.
const TERMINAL_STATUS_WEIGHTS: [OrderStatus, number][] = [
  ["pagada", 84],
  ["rechazada", 6],
  ["expirada", 6],
  ["cancelada", 4],
];
const TODAY_STATUS_WEIGHTS: [OrderStatus, number][] = [
  ["pagada", 55],
  ["en_verificacion", 20],
  ["pendiente_pago", 15],
  ["rechazada", 4],
  ["expirada", 3],
  ["cancelada", 3],
];

export const orders: Order[] = [];
{
  let orderSeq = 0;
  for (let dayOffset = 59; dayOffset >= 0; dayOffset--) {
    const dow = new Date(daysAgo(dayOffset)).getDay();
    const weekendBoost = dow === 5 || dow === 6 ? 1.6 : 1;
    const growth = 1 + ((59 - dayOffset) / 59) * 0.5; // tendencia creciente hacia hoy
    const baseCount = Math.round(randInt(6, 16) * weekendBoost * growth);
    for (let k = 0; k < baseCount; k++) {
      const event = pick(publishedEvents.length ? publishedEvents : events);
      const organizer = organizers.find((o) => o.id === event.organizerId)!;
      const buyer = pick(buyers);
      const quantity = weighted<number>([
        [1, 55],
        [2, 30],
        [3, 10],
        [4, 5],
      ]);
      const status: OrderStatus = dayOffset === 0 ? weighted(TODAY_STATUS_WEIGHTS) : weighted(TERMINAL_STATUS_WEIGHTS);
      const unitPrice = event.priceFromCents || randInt(5, 40) * 100;
      const subtotalCents = unitPrice * quantity;
      const feeCents = Math.max(50, Math.round(subtotalCents * 0.03));
      const commissionRate = COMMISSION_BY_PLAN[organizer.plan];
      const commissionCents = Math.round(subtotalCents * commissionRate);
      const organizerNetCents = subtotalCents - commissionCents;
      const totalCents = subtotalCents + feeCents;
      const method = weighted<PaymentMethod>([
        ["pago_movil", 55],
        ["transferencia", 30],
        ["zelle", 15],
      ]);
      const createdAt = daysAgo(dayOffset, randInt(8, 23), randInt(0, 59));
      orderSeq++;
      orders.push({
        id: `ord-${orderSeq.toString().padStart(5, "0")}`,
        buyerId: buyer.id,
        eventId: event.id,
        eventTitle: event.title,
        organizerId: organizer.id,
        city: event.city,
        category: event.category,
        quantity,
        subtotalCents,
        feeCents,
        totalCents,
        commissionCents,
        organizerNetCents,
        method,
        status,
        reference: status === "pendiente_pago" ? undefined : `${randInt(100000, 999999)}`,
        bank: method !== "zelle" ? pick(BANKS) : undefined,
        createdAt,
        paidAt: status === "pagada" ? createdAt : undefined,
        waitingMinutes: status === "en_verificacion" ? randInt(2, 42) : undefined,
      });
    }
  }
}

// completar totales de compradores a partir de las órdenes generadas
{
  const spentByBuyer = new Map<string, number>();
  const paidByBuyer = new Map<string, number>();
  for (const o of orders) {
    if (o.status === "pagada") {
      spentByBuyer.set(o.buyerId, (spentByBuyer.get(o.buyerId) ?? 0) + o.totalCents);
      paidByBuyer.set(o.buyerId, (paidByBuyer.get(o.buyerId) ?? 0) + 1);
    }
  }
  for (const b of buyers) {
    b.totalSpentCents = spentByBuyer.get(b.id) ?? 0;
    b.paidOrdersCount = paidByBuyer.get(b.id) ?? 0;
    b.pointsBalance = Math.round(b.totalSpentCents / 100) + (b.paidOrdersCount > 0 ? 50 : 0);
    b.tier = b.pointsBalance > 2000 ? "black" : b.pointsBalance > 900 ? "elite" : b.pointsBalance > 400 ? "insider" : b.pointsBalance > 100 ? "frecuente" : "explorador";
  }
}

// --- Cola de retiros ------------------------------------------------------------
export const withdrawals: WithdrawalRequest[] = verifiedOrganizers
  .filter((o) => o.balanceAvailableCents > 20000)
  .slice(0, 8)
  .map((o, i) => ({
    id: `wd-${i.toString().padStart(3, "0")}`,
    organizerId: o.id,
    amountCents: Math.round(o.balanceAvailableCents * (0.4 + rand() * 0.6)),
    status: i < 3 ? "pendiente" : weighted<"pagado" | "rechazado">([["pagado", 85], ["rechazado", 15]]),
    method: pick(["Pago móvil", "Transferencia", "Zelle"]),
    reference: i < 3 ? undefined : `${randInt(100000, 999999)}`,
    requestedAt: daysAgo(randInt(0, 20)),
    resolvedAt: i < 3 ? undefined : daysAgo(randInt(0, 10)),
  }));

// --- Tasa BCV (14 días) -----------------------------------------------------------
export const bcvHistory: BcvRatePoint[] = Array.from({ length: 14 }).map((_, i) => {
  const dayOffset = 13 - i;
  const rateBcv = 178 + dayOffset * 0.82 + rand() * 1.5;
  const marginPct = 3;
  return {
    date: daysAgo(dayOffset).slice(0, 10),
    rateBcv: Math.round(rateBcv * 100) / 100,
    marginPct,
    rateApplied: Math.round(rateBcv * (1 + marginPct / 100) * 100) / 100,
  };
});

// --- Auditoría --------------------------------------------------------------------
const AUDIT_ACTIONS: { action: string; targetKind: "organizer" | "buyer" | "system" }[] = [
  { action: "Aprobó verificación de organizador", targetKind: "organizer" },
  { action: "Rechazó verificación de organizador", targetKind: "organizer" },
  { action: "Suspendió a un organizador", targetKind: "organizer" },
  { action: "Marcó retiro como pagado", targetKind: "organizer" },
  { action: "Aprobó pago", targetKind: "buyer" },
  { action: "Rechazó pago", targetKind: "buyer" },
  { action: "Ajustó puntos de un comprador", targetKind: "buyer" },
  { action: "Bloqueó a un comprador", targetKind: "buyer" },
  { action: "Editó la tasa BCV del día", targetKind: "system" },
  { action: "Puso un evento como destacado", targetKind: "system" },
  { action: "Editó comisión de un plan", targetKind: "system" },
];
export const auditLog: AuditLogEntry[] = Array.from({ length: 36 }).map((_, i) => {
  const { action, targetKind } = pick(AUDIT_ACTIONS);
  const target = targetKind === "organizer" ? pick(organizers).name : targetKind === "buyer" ? pick(buyers).name : "Configuración global";
  return {
    id: `audit-${i.toString().padStart(3, "0")}`,
    actor: pick(["Grey (superadmin)", "Ana (finanzas)", "Luis (soporte)", "Sistema"]),
    action,
    target,
    detail: `${action} — ${target}`,
    createdAt: daysAgo(randInt(0, 45), randInt(7, 22), randInt(0, 59)),
  };
}).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

// --- Soporte ------------------------------------------------------------------------
export const supportTickets: SupportTicket[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `sup-${i.toString().padStart(3, "0")}`,
  buyerName: pick(buyers).name,
  subject: pick([
    "No me llegó el ticket por correo",
    "Quiero reembolso, el evento se canceló",
    "El QR no escanea en la entrada",
    "Cobraron pero la orden sigue pendiente",
    "Quiero cambiar mi método de pago",
    "Pregunta sobre mis puntos Plann",
  ]),
  status: weighted(["abierto", "en_progreso", "resuelto"].map((s) => [s, 1] as [SupportTicket["status"], number])),
  priority: weighted<SupportTicket["priority"]>([["alta", 20], ["media", 50], ["baja", 30]]),
  createdAt: daysAgo(randInt(0, 10), randInt(8, 22)),
}));

// --- Helpers de agregación para el dashboard ---------------------------------------
export function centsToUsd(cents: number): string {
  return (cents / 100).toLocaleString("es-VE", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function gmvByDay(days: number) {
  const map = new Map<string, { gmv: number; orders: number }>();
  for (let i = days - 1; i >= 0; i--) {
    map.set(daysAgo(i).slice(0, 10), { gmv: 0, orders: 0 });
  }
  for (const o of orders) {
    const key = o.createdAt.slice(0, 10);
    if (!map.has(key)) continue;
    if (o.status === "pagada") {
      const entry = map.get(key)!;
      entry.gmv += o.subtotalCents;
      entry.orders += 1;
    }
  }
  return Array.from(map.entries()).map(([date, v]) => ({ date, gmv: v.gmv / 100, orders: v.orders }));
}

export function revenueByChannel() {
  const paid = orders.filter((o) => o.status === "pagada");
  const comisiones = paid.reduce((s, o) => s + o.commissionCents, 0);
  const fees = paid.reduce((s, o) => s + o.feeCents, 0);
  const suscripciones = organizers.filter((o) => o.plan !== "basico").length * 2500 * 3;
  const destacados = events.filter((e) => e.isFeatured).length * 1500;
  return [
    { name: "Comisiones", value: comisiones / 100 },
    { name: "Fees de servicio", value: fees / 100 },
    { name: "Suscripciones", value: suscripciones / 100 },
    { name: "Destacados", value: destacados / 100 },
  ];
}

export function salesByCategory() {
  const paid = orders.filter((o) => o.status === "pagada");
  return CATEGORIES.map((c) => ({
    name: c,
    value: paid.filter((o) => o.category === c).reduce((s, o) => s + o.subtotalCents, 0) / 100,
  })).filter((c) => c.value > 0);
}

export function salesByMethod() {
  const paid = orders.filter((o) => o.status === "pagada");
  return PAYMENT_METHODS.map((m) => ({
    name: m === "pago_movil" ? "Pago móvil" : m === "transferencia" ? "Transferencia" : "Zelle",
    value: paid.filter((o) => o.method === m).length,
  }));
}

export function salesByCity() {
  const paid = orders.filter((o) => o.status === "pagada");
  return CITIES.map((c) => ({
    name: c,
    value: paid.filter((o) => o.city === c).reduce((s, o) => s + o.subtotalCents, 0) / 100,
  })).sort((a, b) => b.value - a.value);
}

export function checkoutFunnel() {
  const created = orders.length;
  const paid = orders.filter((o) => o.status === "pagada").length;
  const abandoned = orders.filter((o) => o.status === "expirada" || o.status === "cancelada").length;
  const rejected = orders.filter((o) => o.status === "rechazada").length;
  const verifying = orders.filter((o) => o.status === "en_verificacion" || o.status === "pendiente_pago").length;
  return { created, paid, abandoned, rejected, verifying, conversionPct: Math.round((paid / created) * 1000) / 10 };
}

export function paymentQueue() {
  return orders
    .filter((o) => o.status === "en_verificacion")
    .sort((a, b) => (b.waitingMinutes ?? 0) - (a.waitingMinutes ?? 0));
}

export function findOrganizer(id: string) {
  return organizers.find((o) => o.id === id);
}
export function findEvent(id: string) {
  return events.find((e) => e.id === id);
}
export function findBuyer(id: string) {
  return buyers.find((b) => b.id === id);
}
export function ordersForOrganizer(organizerId: string) {
  return orders.filter((o) => o.organizerId === organizerId);
}
export function eventsForOrganizer(organizerId: string) {
  return events.filter((e) => e.organizerId === organizerId);
}
export function ordersForBuyer(buyerId: string) {
  return orders.filter((o) => o.buyerId === buyerId);
}
