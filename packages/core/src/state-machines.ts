/**
 * Transiciones de estado permitidas. Fuente: PLANN-PROYECTO.md, secciones 8 y 9.
 * Se valida aquí y también con triggers en Postgres (sección 10.1): ninguna
 * transición fuera de esta lista debe poder ocurrir en ningún lado.
 */

export const ORDER_STATUSES = [
  "pending_payment",
  "in_verification",
  "paid",
  "expired",
  "cancelled",
  "refunded",
  "partially_refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["in_verification", "expired", "cancelled"],
  in_verification: ["paid", "pending_payment", "cancelled"],
  paid: ["refunded", "partially_refunded"],
  expired: [],
  cancelled: [],
  refunded: [],
  partially_refunded: ["refunded"],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export const TICKET_STATUSES = [
  "valid",
  "used",
  "refunded",
  "transferred",
  "void",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

const TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  valid: ["used", "refunded", "transferred", "void"],
  used: ["refunded"],
  refunded: [],
  transferred: ["used", "refunded", "void"],
  void: [],
};

export function canTransitionTicket(from: TicketStatus, to: TicketStatus): boolean {
  return TICKET_TRANSITIONS[from]?.includes(to) ?? false;
}

export const PAYMENT_STATUSES = ["submitted", "matched", "approved", "rejected"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  submitted: ["matched", "approved", "rejected"],
  matched: ["approved", "rejected"],
  approved: [],
  rejected: ["submitted"],
};

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return PAYMENT_TRANSITIONS[from]?.includes(to) ?? false;
}
