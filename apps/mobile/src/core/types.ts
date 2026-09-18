// Tipos del núcleo de negocio para el MVP (sección 26 del documento maestro).
// Montos siempre en centavos de USD (integer). Bs solo para mostrar.

export type EventKind = "event" | "tour" | "experience" | "booking";

export type OrganizerPlan = "basico" | "pro" | "business";

export interface Organizer {
  id: string;
  name: string;
  verified: boolean;
  plan: OrganizerPlan;
  ratingAvg: number;
  ratingCount: number;
  isPlannOwn?: boolean;
}

export interface TicketType {
  id: string;
  eventId: string;
  name: string;
  priceCents: number; // 0 = gratis
  quantity: number;
  sold: number;
  reserved: number;
  minPerOrder: number;
  maxPerOrder: number;
}

export type RefundPolicy = "none" | "24h" | "72h" | "always";

export interface EventItem {
  id: string;
  organizerId: string;
  title: string;
  kind: EventKind;
  category: string;
  city: string;
  imageLabel: string;
  imageUrl: string;
  description: string;
  whatIncludes?: string[];
  venueName: string;
  meetingPoint?: string;
  lat: number;
  lng: number;
  startsAt: string; // ISO
  durationMinutes: number;
  refundPolicy: RefundPolicy;
  minAge?: number;
  ratingAvg: number;
  ratingCount: number;
  ticketTypes: TicketType[];
  isFeatured?: boolean;
  isFree?: boolean;
  sourceCurated?: boolean; // "Cartelera": informativo, todavía no se vende en Plann
}

// "transfer", no "transferencia": debe coincidir exactamente con el check
// constraint de public.payments.method en Supabase.
export type PaymentMethod = "pago_movil" | "transfer" | "zelle";

export type OrderStatus =
  | "pending_payment"
  | "in_verification"
  | "paid"
  | "rejected"
  | "expired"
  | "cancelled";

export interface Order {
  id: string;
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  subtotalCents: number;
  serviceFeeCents: number;
  totalCents: number;
  totalBs: number;
  rateUsed: number;
  commissionCents: number;
  organizerNetCents: number;
  reference?: string;
  rejectionReason?: string;
  createdAt: string;
  expiresAt: string;
  paidAt?: string;
}

export type TicketStatus = "valid" | "used" | "void";

export interface TicketRecord {
  id: string;
  code: string; // PLN-XXXXXX
  orderId: string;
  eventId: string;
  attendeeName: string;
  status: TicketStatus;
  checkedInAt?: string;
}

export interface ExchangeRate {
  date: string;
  rateBcv: number;
  marginPct: number;
  rateApplied: number;
}

export type LoyaltyTierKey = "explorador" | "frecuente" | "insider" | "elite" | "black";

export interface LoyaltyEntry {
  id: string;
  points: number; // negativo si es una reversión
  reason: string;
  orderId?: string;
  createdAt: string;
}

export type OrganizerStatus = "none" | "pending" | "verified";
