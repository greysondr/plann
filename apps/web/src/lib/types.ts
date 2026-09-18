// Tipos del dominio para el admin (sección 7 y 17 del documento maestro).
// Espejan el modelo de apps/mobile pero con los campos que necesita el
// equipo de Plann para operar: KYC, conciliación, retiros y auditoría.

export type City = "Barquisimeto" | "Cabudare" | "Quíbor" | "Cubiro" | "Yacambú" | "El Tocuyo";

export type Category =
  | "Conciertos"
  | "Fiestas"
  | "Tours"
  | "Deportes"
  | "Familia"
  | "Teatro"
  | "Gastronomía"
  | "Ferias";

export type OrganizerPlan = "basico" | "pro" | "business";

export type OrganizerVerification = "pendiente" | "verificado" | "rechazado" | "suspendido";

export interface Organizer {
  id: string;
  name: string;
  legalName: string;
  documentId: string;
  email: string;
  phone: string;
  city: City;
  plan: OrganizerPlan;
  verification: OrganizerVerification;
  ratingAvg: number;
  ratingCount: number;
  refundRatePct: number;
  reportsCount: number;
  createdAt: string;
  balanceAvailableCents: number;
  balancePendingCents: number;
  notes: { id: string; author: string; text: string; createdAt: string }[];
}

export type EventStatus = "borrador" | "en_revision" | "publicado" | "pausado" | "cancelado";

export interface EventItem {
  id: string;
  organizerId: string;
  title: string;
  category: Category;
  city: City;
  status: EventStatus;
  startsAt: string;
  priceFromCents: number;
  capacity: number;
  sold: number;
  revenueCents: number;
  ratingAvg: number;
  reportsCount: number;
  isFeatured: boolean;
  createdAt: string;
}

export type PaymentMethod = "pago_movil" | "transferencia" | "zelle";

export type OrderStatus = "pendiente_pago" | "en_verificacion" | "pagada" | "rechazada" | "expirada" | "cancelada";

export interface Order {
  id: string;
  buyerId: string;
  eventId: string;
  eventTitle: string;
  organizerId: string;
  city: City;
  category: Category;
  quantity: number;
  subtotalCents: number;
  feeCents: number;
  totalCents: number;
  commissionCents: number;
  organizerNetCents: number;
  method: PaymentMethod;
  status: OrderStatus;
  reference?: string;
  bank?: string;
  createdAt: string;
  paidAt?: string;
  waitingMinutes?: number;
}

export type LoyaltyTierKey = "explorador" | "frecuente" | "insider" | "elite" | "black";

export interface Buyer {
  id: string;
  name: string;
  email: string;
  phone: string;
  documentId: string;
  city: City;
  createdAt: string;
  ordersCount: number;
  paidOrdersCount: number;
  totalSpentCents: number;
  pointsBalance: number;
  tier: LoyaltyTierKey;
  devicesCount: number;
  flagged: boolean;
  notes: { id: string; author: string; text: string; createdAt: string }[];
}

export type WithdrawalStatus = "pendiente" | "pagado" | "rechazado";

export interface WithdrawalRequest {
  id: string;
  organizerId: string;
  amountCents: number;
  status: WithdrawalStatus;
  method: string;
  reference?: string;
  requestedAt: string;
  resolvedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
  createdAt: string;
}

export interface BcvRatePoint {
  date: string;
  rateBcv: number;
  marginPct: number;
  rateApplied: number;
}

export interface SupportTicket {
  id: string;
  buyerName: string;
  subject: string;
  status: "abierto" | "en_progreso" | "resuelto";
  priority: "baja" | "media" | "alta";
  createdAt: string;
}
